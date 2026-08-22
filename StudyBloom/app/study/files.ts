import { strFromU8, unzipSync } from "fflate";
import { extractPdf } from "./pdf";

export type ExtractedFile = {
  text: string;
  pages: number;
  ocrUsed: boolean;
  sourceType: "PDF" | "Document" | "Slides" | "Text" | "Image" | "Audio";
};

const extension = (name: string) => name.toLowerCase().split(".").pop() || "";
const cleanXml = (xml: string) => xml
  .replace(/<w:tab\/?[^>]*>/g, "\t")
  .replace(/<w:br\/?[^>]*>/g, "\n")
  .replace(/<\/w:p>/g, "\n")
  .replace(/<\/a:p>/g, "\n")
  .replace(/<[^>]+>/g, " ")
  .replace(/&amp;/g, "&")
  .replace(/&lt;/g, "<")
  .replace(/&gt;/g, ">")
  .replace(/&quot;/g, '"')
  .replace(/&#39;/g, "'")
  .replace(/[ \t]+/g, " ")
  .replace(/\n{3,}/g, "\n\n")
  .trim();

function readableBinary(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  const latin = new TextDecoder("windows-1252").decode(bytes);
  const utf16 = new TextDecoder("utf-16le").decode(bytes);
  const clean = (value: string) => value
    .replace(/[^\x20-\x7E\u00A0-\u024F\n\r\t]/g, " ")
    .split(/\s{2,}|[\r\n]+/)
    .map((part) => part.trim())
    .filter((part) => part.length >= 4 && /[A-Za-z]{2}/.test(part))
    .join("\n");
  const candidates = [clean(latin), clean(utf16)];
  return candidates.sort((a, b) => b.length - a.length)[0].slice(0, 250000);
}

async function officeXml(file: File, kind: "Document" | "Slides") {
  const archive = unzipSync(new Uint8Array(await file.arrayBuffer()));
  const names = Object.keys(archive)
    .filter((name) => kind === "Document" ? name === "word/document.xml" : /^ppt\/slides\/slide\d+\.xml$/.test(name))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  const text = names.map((name) => cleanXml(strFromU8(archive[name]))).join("\n\n");
  return { text, pages: Math.max(1, names.length) };
}

async function transcribeAudio(file: File, onProgress: (message: string, percent: number) => void) {
  onProgress("Uploading audio for transcription", 22);
  const data = new FormData();
  data.append("file", file);
  const response = await fetch("/api/transcribe", { method: "POST", body: data });
  const payload = await response.json() as { text?: string; error?: string };
  if (!response.ok || !payload.text) throw new Error(payload.error || "Audio transcription failed");
  onProgress("Turning the transcript into a study kit", 68);
  return payload.text;
}

export async function extractStudyFile(
  file: File,
  useOcr: boolean,
  allowAudioAi: boolean,
  onProgress: (message: string, percent: number) => void,
): Promise<ExtractedFile> {
  const ext = extension(file.name);
  if (ext === "pdf") {
    const result = await extractPdf(file, useOcr, onProgress);
    return { ...result, sourceType: "PDF" };
  }
  if (["docx", "pptx"].includes(ext)) {
    onProgress(`Reading your ${ext === "docx" ? "document" : "slides"} locally`, 30);
    const result = await officeXml(file, ext === "docx" ? "Document" : "Slides");
    return { ...result, ocrUsed: false, sourceType: ext === "docx" ? "Document" : "Slides" };
  }
  if (ext === "doc") {
    onProgress("Recovering text from the Word document", 35);
    const text = readableBinary(await file.arrayBuffer());
    if (text.length < 80) throw new Error("This older .doc file could not be read reliably. Save it as .docx and try again.");
    return { text, pages: 1, ocrUsed: false, sourceType: "Document" };
  }
  if (["png", "jpg", "jpeg", "webp", "bmp"].includes(ext) || file.type.startsWith("image/")) {
    if (!useOcr) throw new Error("Turn on OCR in Settings to read image notes.");
    onProgress("Reading handwriting and text in the image", 35);
    const { createWorker } = await import("tesseract.js");
    const worker = await createWorker("eng", 1, { logger: (event) => event.status === "recognizing text" && onProgress("Reading the image with OCR", 35 + Math.round(event.progress * 45)) });
    const result = await worker.recognize(file);
    await worker.terminate();
    return { text: result.data.text, pages: 1, ocrUsed: true, sourceType: "Image" };
  }
  if (["mp3", "m4a", "wav", "webm", "ogg", "flac", "mp4", "mpeg", "mpga"].includes(ext) || file.type.startsWith("audio/")) {
    if (!allowAudioAi) throw new Error("Audio transcription needs optional AI tools enabled in Settings.");
    return { text: await transcribeAudio(file, onProgress), pages: 1, ocrUsed: false, sourceType: "Audio" };
  }
  if (ext === "rtf") {
    const text = (await file.text()).replace(/\\par[d]?/g, "\n").replace(/\\'[0-9a-f]{2}/gi, " ").replace(/\\[a-z]+-?\d* ?/gi, "").replace(/[{}]/g, "");
    return { text, pages: 1, ocrUsed: false, sourceType: "Document" };
  }
  if (["txt", "md", "markdown", "csv", "json", "html", "htm", "xml"].includes(ext) || file.type.startsWith("text/")) {
    onProgress("Reading your text file locally", 45);
    let text = await file.text();
    if (["html", "htm", "xml"].includes(ext)) text = new DOMParser().parseFromString(text, "text/html").body.textContent || "";
    return { text, pages: 1, ocrUsed: false, sourceType: "Text" };
  }
  throw new Error("That file type is not supported yet. Try PDF, DOC, DOCX, PPTX, text, image, or audio.");
}
