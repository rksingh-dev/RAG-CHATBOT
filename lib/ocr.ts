// OCR support for scanned PDFs
// Uses pdfjs-dist to render PDF pages to images, then tesseract.js for text recognition

declare const __non_webpack_require__: typeof require;

interface OCRPageResult {
  pageNumber: number;
  text: string;
  confidence: number;
}

export async function extractTextWithOCR(pdfBuffer: Buffer): Promise<{
  text: string;
  totalPages: number;
  avgConfidence: number;
}> {
  // Load dependencies at runtime to bypass webpack bundling
  const pdfjsLib = __non_webpack_require__('pdfjs-dist/legacy/build/pdf');
  const { createCanvas } = __non_webpack_require__('@napi-rs/canvas');
  const Tesseract = __non_webpack_require__('tesseract.js');

  // Custom canvas factory so pdfjs-dist can render without the 'canvas' npm package
  class NodeCanvasFactory {
    create(width: number, height: number) {
      const canvas = createCanvas(width, height);
      const context = canvas.getContext('2d');
      return { canvas, context };
    }
    reset(canvasAndContext: any, width: number, height: number) {
      canvasAndContext.canvas.width = width;
      canvasAndContext.canvas.height = height;
    }
    destroy(_canvasAndContext: any) {
      // no-op
    }
  }

  // Load the PDF document
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(pdfBuffer) });
  const doc = await loadingTask.promise;
  const numPages = doc.numPages;

  // Create a persistent tesseract worker (reused across all pages for speed)
  const worker = await Tesseract.createWorker('eng');

  const pageResults: OCRPageResult[] = [];

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    const page = await doc.getPage(pageNum);
    
    // Render at 2x scale for better OCR accuracy
    const viewport = page.getViewport({ scale: 2.0 });
    const canvasFactory = new NodeCanvasFactory();
    const { canvas, context } = canvasFactory.create(viewport.width, viewport.height);

    await page.render({
      canvasContext: context,
      viewport: viewport,
      canvasFactory: canvasFactory,
    }).promise;

    // Convert canvas to PNG buffer
    const pngBuffer = canvas.toBuffer('image/png');

    // OCR the rendered page image
    const { data } = await worker.recognize(pngBuffer);

    pageResults.push({
      pageNumber: pageNum,
      text: data.text,
      confidence: data.confidence,
    });

    // Clean up page resources
    page.cleanup();
  }

  await worker.terminate();

  const fullText = pageResults.map(r => r.text).join('\n\n');
  const avgConfidence = pageResults.length > 0
    ? pageResults.reduce((sum, r) => sum + r.confidence, 0) / pageResults.length
    : 0;

  return {
    text: fullText,
    totalPages: numPages,
    avgConfidence: Math.round(avgConfidence),
  };
}
