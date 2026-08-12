import { MAX_EXTRACT_CHARS, MAX_EXTRACT_PAGES } from "./media";

// Text extraction for visitor-uploaded documents.
//
// Without this the assistant is told only "[Customer sent a document]" and
// answers "I'm unable to view the contents" - which, when the customer has just
// sent the thing they want help with, reads as broken.
//
// Extraction happens ONCE, when the message is sent, and the result is stored
// on the message row (content.media_text). Later turns reuse it, so a long
// conversation never re-parses the same PDF.
//
// Node runtime only (pdf.js): the routes that call this are the default
// nodejs runtime, not edge.

/** Collapse the whitespace pdf.js scatters through extracted text. */
function tidy(raw: string): string {
  return raw
    .replace(/\r/g, "")
    // Any run of horizontal whitespace, including the non-breaking spaces pdf.js emits.
    .replace(/[^\S\n]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function cap(text: string): string {
  if (text.length <= MAX_EXTRACT_CHARS) return text;
  return `${text.slice(0, MAX_EXTRACT_CHARS)}\n…[truncated]`;
}

async function extractPdf(bytes: Uint8Array): Promise<string | null> {
  // Imported lazily: pdf.js is heavy, and most messages carry no document at
  // all. Keeping it out of the module graph keeps the cold start of every
  // other widget route unaffected.
  const { extractText, getDocumentProxy } = await import("unpdf");
  // A copy, because pdf.js transfers/detaches the buffer it is handed and the
  // caller still needs the bytes to upload or hash.
  const pdf = await getDocumentProxy(new Uint8Array(bytes));
  const { text } = await extractText(pdf, { mergePages: false });
  const pages = (Array.isArray(text) ? text : [text]).slice(0, MAX_EXTRACT_PAGES);
  const joined = pages
    .map((p, i) => (pages.length > 1 ? `[page ${i + 1}]\n${p}` : p))
    .join("\n\n");
  return tidy(joined) || null;
}

function extractPlainText(bytes: Uint8Array): string | null {
  // fatal:false so a stray byte in an otherwise readable file does not throw.
  const text = tidy(new TextDecoder("utf-8", { fatal: false }).decode(bytes));
  return text || null;
}

/**
 * Readable text from an uploaded document, or null when the format carries none
 * we can get at (docx/xlsx/zip) or the file is unparseable.
 *
 * Never throws: a document that cannot be read must still arrive as a message.
 * The agent can always open it by hand.
 */
export async function extractDocumentText(
  bytes: Uint8Array,
  mimeType: string
): Promise<string | null> {
  const mime = mimeType.split(";")[0].trim().toLowerCase();
  try {
    if (mime === "application/pdf") {
      const text = await extractPdf(bytes);
      return text ? cap(text) : null;
    }
    if (mime === "text/plain" || mime === "text/csv") {
      const text = extractPlainText(bytes);
      return text ? cap(text) : null;
    }
    // Office formats are zip containers; reading them would mean another
    // dependency for a case that has not come up yet. They stay described.
    return null;
  } catch (e) {
    console.error("[Media] extraction failed:", mime, e);
    return null;
  }
}
