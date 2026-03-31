import { NextRequest, NextResponse } from 'next/server';
import { env } from '@xenova/transformers';
import { store, DocumentChunk } from '@/lib/store';
import { chunkDocument } from '@/lib/documents';
import { extractTextWithOCR } from '@/lib/ocr';
import { embedBatch, warmupModels } from '@/lib/embeddings';

env.allowLocalModels = false;

declare const __non_webpack_require__: typeof require;

const MIN_TEXT_LENGTH = 50;

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

    // Start warming models in parallel with PDF extraction
    const modelWarmup = warmupModels();

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // ── STEP 1: Extract text (digital + OCR fallback) ──
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

    await modelWarmup;

    // ── STEP 2: Parent-child chunking with contextual headers ──
    const textChunks = chunkDocument(textContent, {
      childChunkSize: 256,
      parentChunkSize: 1024,
      overlap: 50,
      minChunkLength: 40,
      docTitle: file.name,
    });

    if (textChunks.length === 0) {
      return NextResponse.json({ error: 'No valid chunks extracted' }, { status: 400 });
    }

    // ── STEP 3: Generate embeddings ──
    // Use embeddingContent (includes contextual header) for better search
    const chunkTexts = textChunks.map(c => c.embeddingContent);
    const embeddings = await embedBatch(chunkTexts, (done, total) => {
      if (done % 10 === 0 || done === total) {
        console.log(`[Upload] Embedded ${done}/${total} chunks`);
      }
    });

    // ── STEP 4: Build document chunks ──
    const documentChunks: DocumentChunk[] = textChunks.map((chunk, i) => ({
      id: `${file.name}-${chunk.metadata.role}-${chunk.metadata.chunkIndex}`,
      content: chunk.content,
      docTitle: file.name,
      embedding: embeddings[i],
      metadata: {
        chunkIndex: chunk.metadata.chunkIndex,
        totalChunks: chunk.metadata.totalChunks,
        estimatedPage: chunk.metadata.estimatedPage,
        parentIndex: chunk.metadata.parentIndex,
        role: chunk.metadata.role,
        contextHeader: chunk.metadata.contextHeader,
      },
    }));

    // ── STEP 5: Save to persistent store ──
    store.setChunks(documentChunks);

    const searchCount = documentChunks.filter(c => c.metadata.role === 'search').length;
    const contextCount = documentChunks.filter(c => c.metadata.role === 'context').length;

    return NextResponse.json({
      success: true,
      message: usedOCR
        ? 'PDF processed with OCR successfully'
        : 'PDF processed successfully',
      totalChunks: documentChunks.length,
      searchChunks: searchCount,
      contextChunks: contextCount,
      usedOCR,
      pipeline: {
        embeddingModel: 'bge-small-en-v1.5',
        chunking: 'parent-child with contextual headers',
        childSize: 256,
        parentSize: 1024,
        overlap: 50,
      },
    });

  } catch (error: any) {
    console.error('Upload Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error during upload' },
      { status: 500 }
    );
  }
}
