export async function extractPdf(
  file: File,
  useOcr: boolean,
  onProgress: (message: string, percent: number) => void,
) {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
  const bytes = new Uint8Array(await file.arrayBuffer());
  const document = await pdfjs.getDocument({ data: bytes }).promise;
  const pageLimit = Math.min(document.numPages, 80);
  const pageTexts: string[] = [];
  for (let pageNumber = 1; pageNumber <= pageLimit; pageNumber += 1) {
    onProgress(`Reading page ${pageNumber} of ${pageLimit}`, Math.round((pageNumber / pageLimit) * 45));
    const page = await document.getPage(pageNumber);
    const content = await page.getTextContent();
    pageTexts.push(content.items.map((item) => ("str" in item ? item.str : "")).join(" "));
  }
  let text = pageTexts.join("\n").trim();
  let ocrUsed = false;
  const sparsePages = pageTexts.filter((page) => page.trim().length < 45).length;
  if (useOcr && (text.length < 180 || sparsePages > pageLimit * 0.7)) {
    ocrUsed = true;
    const { createWorker } = await import("tesseract.js");
    const worker = await createWorker("eng", 1, {
      logger: (event) => {
        if (event.status === "recognizing text") onProgress("Reading scanned pages with OCR", 50 + Math.round(event.progress * 45));
      },
    });
    const ocrText: string[] = [];
    const ocrLimit = Math.min(document.numPages, 12);
    for (let pageNumber = 1; pageNumber <= ocrLimit; pageNumber += 1) {
      onProgress(`OCR page ${pageNumber} of ${ocrLimit}`, 50 + Math.round((pageNumber / ocrLimit) * 45));
      const page = await document.getPage(pageNumber);
      const viewport = page.getViewport({ scale: 1.55 });
      const canvas = window.document.createElement("canvas");
      const context = canvas.getContext("2d");
      if (!context) continue;
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      await page.render({ canvas, canvasContext: context, viewport }).promise;
      const result = await worker.recognize(canvas);
      ocrText.push(result.data.text);
    }
    await worker.terminate();
    text = ocrText.join("\n").trim();
  }
  onProgress("Finishing your study kit", 98);
  return { text, pages: document.numPages, ocrUsed };
}
