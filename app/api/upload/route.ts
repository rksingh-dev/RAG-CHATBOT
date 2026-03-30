import { NextRequest, NextResponse } from 'next/server';
import { env, pipeline } from '@xenova/transformers';
import { store, DocumentChunk } from '@/lib/store';
import { chunkDocument } from '@/lib/documents';

// Disable local model loading — always fetch from HuggingFace Hub
env.allowLocalModels = false;

// __non_webpack_require__ is a webpack global that maps to Node.js's real require().
// Unlike regular require(), webpack does NOT transform or bundle modules loaded this way.
// This is the official webpack escape hatch for loading CJS modules that break under bundling.
declare const __non_webpack_require__: typeof require;

// Singleton to avoid re-loading the embedding model on every request
class PipelineSingleton {
  static task: any = 'feature-extraction';
  static model = 'Xenova/all-MiniLM-L6-v2';
  static instance: any = null;

  static async getInstance() {
    if (this.instance === null) {
      this.instance = await pipeline(this.task, this.model);
    }
    return this.instance;
  }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'File must be a PDF' }, { status: 400 });
    }

    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json({ error: 'File exceeds 50MB limit' }, { status: 400 });
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Load pdf-parse at runtime using webpack's built-in escape hatch
    const pdfParse = __non_webpack_require__('pdf-parse');
    const pdfData = await pdfParse(buffer);
    const textContent: string = pdfData.text;

    if (!textContent || textContent.trim() === '') {
      return NextResponse.json({ error: 'Could not extract text from PDF' }, { status: 400 });
    }

    // Chunk the extracted text
    const rawChunks = chunkDocument(textContent, 500);

    if (rawChunks.length === 0) {
      return NextResponse.json({ error: 'No valid chunks extracted' }, { status: 400 });
    }

    // Load the embedding model (cached after first load)
    const extractor = await PipelineSingleton.getInstance();
    
    // Generate embeddings for each chunk
    const uploadedChunks: DocumentChunk[] = [];
    
    for (let i = 0; i < rawChunks.length; i++) {
      const chunkText = rawChunks[i];
      const output = await extractor(chunkText, { pooling: 'mean', normalize: true });
      const embeddingArray = Array.from(output.data) as number[];
      
      uploadedChunks.push({
        content: chunkText,
        docTitle: file.name,
        embedding: embeddingArray,
      });
    }

    // Save to in-memory store
    store.setChunks(uploadedChunks);

    return NextResponse.json({ 
      success: true, 
      message: 'PDF processed successfully',
      chunksProcessed: uploadedChunks.length,
    });

  } catch (error: any) {
    console.error('Upload Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error during upload' },
      { status: 500 }
    );
  }
}
