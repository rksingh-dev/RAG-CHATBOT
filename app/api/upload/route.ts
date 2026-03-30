import { NextRequest, NextResponse } from 'next/server';
import { env, pipeline } from '@xenova/transformers';
import { store, DocumentChunk } from '@/lib/store';
import { chunkDocument } from '@/lib/documents';
import { extractTextWithOCR } from '@/lib/ocr';

// Disable local model loading — always fetch from HuggingFace Hub
env.allowLocalModels = false;

// __non_webpack_require__ is a webpack global that maps to Node.js's real require().
// Unlike regular require(), webpack does NOT transform or bundle modules loaded this way.
// This is the official webpack escape hatch for loading CJS modules that break under bundling.
declare const __non_webpack_require__: typeof require;

// Minimum characters to consider pdf-parse extraction valid.
// Scanned PDFs usually return empty or very short strings (just whitespace/page numbers).
const MIN_TEXT_LENGTH = 50;

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

    // ── STEP 1: Try digital text extraction first ──
    let textContent = '';
    let usedOCR = false;

    try {
      const pdfParse = __non_webpack_require__('pdf-parse');
      const pdfData = await pdfParse(buffer);
      textContent = pdfData.text || '';
    } catch (parseError) {
      console.warn('pdf-parse failed, will attempt OCR:', parseError);
      textContent = '';
    }

    // ── STEP 2: If digital text is too sparse, fall back to OCR ──
    if (textContent.trim().length < MIN_TEXT_LENGTH) {
      console.log(`Digital text too short (${textContent.trim().length} chars). Attempting OCR...`);
      
      try {
        const ocrResult = await extractTextWithOCR(buffer);
        textContent = ocrResult.text;
        usedOCR = true;
        
        console.log(
          `OCR complete: ${ocrResult.totalPages} pages, ` +
          `${textContent.length} chars, ` +
          `avg confidence: ${ocrResult.avgConfidence}%`
        );
      } catch (ocrError: any) {
        console.error('OCR failed:', ocrError);
        return NextResponse.json(
          { error: 'Could not extract text from PDF. Both digital extraction and OCR failed.' },
          { status: 400 }
        );
      }
    }

    if (!textContent || textContent.trim().length < 10) {
      return NextResponse.json(
        { error: 'Could not extract meaningful text from PDF' },
        { status: 400 }
      );
    }

    // ── STEP 3: Chunk the extracted text ──
    const rawChunks = chunkDocument(textContent, 500);

    if (rawChunks.length === 0) {
      return NextResponse.json({ error: 'No valid chunks extracted' }, { status: 400 });
    }

    // ── STEP 4: Generate embeddings ──
    const extractor = await PipelineSingleton.getInstance();
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

    // ── STEP 5: Save to in-memory store ──
    store.setChunks(uploadedChunks);

    return NextResponse.json({ 
      success: true, 
      message: usedOCR 
        ? `PDF processed with OCR successfully` 
        : 'PDF processed successfully',
      chunksProcessed: uploadedChunks.length,
      usedOCR,
    });

  } catch (error: any) {
    console.error('Upload Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error during upload' },
      { status: 500 }
    );
  }
}
