import { PILOT_CHARS_PER_DOC } from "./config";

/**
 * Turning whatever a person drops onto the page into text the engine can read, and saying plainly
 * when it cannot.
 *
 * There is deliberately no OCR and no image handling here on the offline path: a system that fills a
 * field it could not read is the failure this product exists to prevent, so a scan without a text
 * layer comes back as a hold with the reason, not as a confident guess.
 */

export type IntakeKind = "text" | "pdf" | "image" | "other";

export interface Picked {
  name: string;
  bytes: number;
  kind: IntakeKind;
  /** Empty when there was nothing machine-readable in the file. */
  text: string;
  /** How the text was obtained — printed next to the result, because it changes what is trusted. */
  how: "pasted" | "plain" | "pdf text layer" | "none";
  /** Set when the file could not be read; this becomes the hold reason, not a silent skip. */
  unreadable?: string;
  truncated?: boolean;
}

const PDF_MIME = /^application\/pdf$/i;
const IMAGE_MIME = /^image\//i;
const TEXTISH = /^text\/|json|xml|csv|html|x-yaml/i;

export const kindOf = (name: string, type: string): IntakeKind =>
  PDF_MIME.test(type) || /\.pdf$/i.test(name) ? "pdf"
  : IMAGE_MIME.test(type) || /\.(png|jpe?g|webp|tif?f|heic|bmp)$/i.test(name) ? "image"
  : TEXTISH.test(type) || /\.(txt|md|csv|eml|json|xml|log)$/i.test(name) ? "text"
  : "other";

/** unpdf is imported lazily: pdf.js is a third of the payload and belongs in no browser bundle. */
async function pdfText(bytes: Uint8Array): Promise<{ text: string; pages: number }> {
  const { extractText, getDocumentProxy } = await import("unpdf");
  const doc = await getDocumentProxy(bytes);
  const { text, totalPages } = await extractText(doc, { mergePages: true });
  return { text: Array.isArray(text) ? text.join("\n") : String(text ?? ""), pages: totalPages ?? 1 };
}

/** One file from a multipart form body. Never throws: an unreadable file is a result, not a 500. */
export async function readUpload(file: File, maxBytes: number): Promise<Picked> {
  const name = (file.name || "document").replace(/[\\/]/g, "_").slice(0, 120);
  const bytes = file.size;
  const kind = kindOf(name, file.type || "");
  const base: Picked = { name, bytes, kind, text: "", how: "none" };

  if (bytes > maxBytes)
    return { ...base, unreadable: `${(bytes / 1_048_576).toFixed(1)} MB — this deployment caps one document at ${(maxBytes / 1_048_576).toFixed(1)} MB (the platform's request limit is 4.5 MB, so a bigger cap would fail the whole upload)` };

  let buf: Uint8Array;
  try {
    buf = new Uint8Array(await file.arrayBuffer());
  } catch {
    return { ...base, unreadable: "the file could not be read from the request body" };
  }
  if (!buf.byteLength) return { ...base, unreadable: "the file is empty" };

  if (kind === "pdf") {
    try {
      const { text, pages } = await pdfText(buf);
      const clean = text.replace(/\u0000/g, "").trim();
      if (clean.length < 24)
        return { ...base, unreadable: `a ${pages}-page PDF with no text layer — that is a scan, and a scan needs OCR. OCR is not run on this deployment, so the document is held rather than read into a guess` };
      const cut = clean.length > PILOT_CHARS_PER_DOC;
      return { ...base, text: clean.slice(0, PILOT_CHARS_PER_DOC), how: "pdf text layer", truncated: cut };
    } catch (e) {
      return { ...base, unreadable: `the PDF could not be parsed (${(e as Error).message.slice(0, 60)})` };
    }
  }

  if (kind === "image")
    return { ...base, unreadable: "an image, and this deployment runs no vision model — a photo of an invoice is exactly what a pilot build reads once one is enabled, so it is held here rather than guessed at" };

  if (kind === "text") {
    const clean = new TextDecoder("utf-8", { fatal: false }).decode(buf).replace(/\u0000/g, "").trim();
    if (clean.length < 24) return { ...base, unreadable: "the text file had nothing readable in it" };
    const cut = clean.length > PILOT_CHARS_PER_DOC;
    return { ...base, text: clean.slice(0, PILOT_CHARS_PER_DOC), how: "plain", truncated: cut };
  }

  // .docx, .xlsx, a .eml with a real body — all of these are text in a container. Try decoding, and
  // if the container wins, say so instead of pretending the document was empty.
  const raw = new TextDecoder("utf-8", { fatal: false }).decode(buf);
  const printable = raw.replace(/[^\x20-\x7e\n]/g, "");
  if (printable.length > 120 && /Invoice|Order|Qty|Total|PO\b|Delivery/i.test(printable))
    return { ...base, text: printable.slice(0, PILOT_CHARS_PER_DOC), how: "plain", truncated: printable.length > PILOT_CHARS_PER_DOC };

  return { ...base, unreadable: `${file.type || "an unrecognised file type"} is not something this deployment can read yet — the machine takes a PDF with a text layer, plain text, or pasted text. Word and Excel intake is a build line, not a silently-skipped file` };
}

/** Pasted text goes through the same caps, so "paste" and "upload" cannot disagree. */
export function fromPaste(text: string, name = "pasted document"): Picked {
  const clean = (text ?? "").replace(/\u0000/g, "").trim();
  const cut = clean.length > PILOT_CHARS_PER_DOC;
  return { name, bytes: clean.length, kind: "text", text: clean.slice(0, PILOT_CHARS_PER_DOC),
    how: "pasted", truncated: cut, unreadable: clean.length < 24 ? "too little text to read a document from" : undefined };
}
