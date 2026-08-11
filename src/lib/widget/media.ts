// Attachment rules for the web chat widget, shared by the browser (composer
// pre-checks) and the API (the checks that actually count).
//
// Nothing here touches Supabase or node APIs on purpose: the widget page is a
// client component and imports it directly. Storage-side helpers live in
// media-storage.ts.
//
// See docs/phase1-spec-widget-and-onboarding.md §6.

export const MEDIA_BUCKET = "chat-media";

/**
 * Hard cap on what /api/widget/upload accepts.
 *
 * 4 MB, not 10: the upload is a normal request to a Next route, and on Vercel a
 * serverless function's request body is capped at 4.5 MB — a bigger file is
 * rejected by the platform before our handler ever runs, so the visitor would
 * see an opaque 413. Images are downscaled in the browser first
 * (image-resize.ts), which puts phone photos far under this.
 */
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

/**
 * Largest file the composer will even try to process. Images above this are
 * still accepted — they get downscaled below MAX_UPLOAD_BYTES first — but a
 * 60 MB original is not worth decoding in a customer's tab.
 */
export const MAX_PICK_BYTES = 25 * 1024 * 1024;

export type MediaKind = "image" | "document";

/**
 * SVG is deliberately absent: it is a script-bearing document that browsers
 * render as an image, and these files are shown inside the widget and the
 * agent dashboard.
 */
export const IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/heic",
  "image/heif",
] as const;

export const DOCUMENT_MIME_TYPES = [
  "application/pdf",
  "text/plain",
  "text/csv",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/zip",
] as const;

/** `accept` attributes for the two file inputs. */
export const IMAGE_ACCEPT = IMAGE_MIME_TYPES.join(",");
export const DOCUMENT_ACCEPT = DOCUMENT_MIME_TYPES.join(",");

const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/heif": "heif",
  "application/pdf": "pdf",
  "text/plain": "txt",
  "text/csv": "csv",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/vnd.ms-excel": "xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "application/vnd.ms-powerpoint": "ppt",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
  "application/zip": "zip",
};

/** Which of the two kinds a mime type belongs to, or null if not allowed. */
export function mediaKindFor(mimeType: string): MediaKind | null {
  const mime = mimeType.split(";")[0].trim().toLowerCase();
  if ((IMAGE_MIME_TYPES as readonly string[]).includes(mime)) return "image";
  if ((DOCUMENT_MIME_TYPES as readonly string[]).includes(mime)) return "document";
  return null;
}

export function extensionFor(mimeType: string): string {
  return EXTENSIONS[mimeType.split(";")[0].trim().toLowerCase()] || "bin";
}

const FILENAME_BANNED = new Set(['"', "<", ">", "|", ":", "*", "?"]);

/**
 * Filename as shown and as offered for download. Path separators, control
 * characters and shell-hostile punctuation go: this string ends up in a
 * Content-Disposition header and in the dashboard's DOM.
 */
export function sanitizeFilename(name: string): string {
  const base = name.split(/[\\/]/).pop() || "";
  const cleaned = Array.from(base)
    .filter((ch) => {
      const code = ch.codePointAt(0) ?? 0;
      // Control characters, including NUL (used to truncate C-string paths).
      if (code < 0x20 || code === 0x7f) return false;
      return !FILENAME_BANNED.has(ch);
    })
    .join("")
    .trim();

  if (!cleaned || cleaned === "." || cleaned === "..") return "attachment";
  return cleaned.slice(0, 120);
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export interface MediaCheck {
  ok: boolean;
  kind?: MediaKind;
  /** Visitor-facing, already phrased for display in the widget. */
  error?: string;
}

/** Shared name/type/size gate. Run in the composer AND in the upload route. */
export function checkUpload(
  file: { name: string; type: string; size: number },
  maxBytes = MAX_UPLOAD_BYTES
): MediaCheck {
  const kind = mediaKindFor(file.type || "");
  if (!kind) {
    return { ok: false, error: "That file type isn't supported." };
  }
  if (!file.size) {
    return { ok: false, error: "That file appears to be empty." };
  }
  if (file.size > maxBytes) {
    return { ok: false, error: `Files must be under ${formatBytes(maxBytes)}.` };
  }
  return { ok: true, kind };
}

/**
 * Content sniffing, so a .exe renamed to .pdf cannot be stored under a mime
 * type that makes the dashboard render it inline. Returns the family the bytes
 * actually belong to, or null when the format carries no signature (plain text
 * and CSV, which are checked by declared type alone).
 */
export function sniffKind(bytes: Uint8Array): MediaKind | null {
  const b = (i: number) => bytes[i];
  const starts = (...sig: number[]) => sig.every((v, i) => b(i) === v);

  if (starts(0xff, 0xd8, 0xff)) return "image"; // JPEG
  if (starts(0x89, 0x50, 0x4e, 0x47)) return "image"; // PNG
  if (starts(0x47, 0x49, 0x46, 0x38)) return "image"; // GIF87a/89a
  // RIFF....WEBP
  if (
    starts(0x52, 0x49, 0x46, 0x46) &&
    b(8) === 0x57 &&
    b(9) === 0x45 &&
    b(10) === 0x42 &&
    b(11) === 0x50
  ) {
    return "image";
  }
  // ....ftyp — ISO base media container, which is what HEIC/HEIF from iPhones is.
  if (b(4) === 0x66 && b(5) === 0x74 && b(6) === 0x79 && b(7) === 0x70) return "image";

  if (starts(0x25, 0x50, 0x44, 0x46)) return "document"; // %PDF
  if (starts(0x50, 0x4b, 0x03, 0x04)) return "document"; // zip: docx/xlsx/pptx
  if (starts(0xd0, 0xcf, 0x11, 0xe0)) return "document"; // legacy OLE: doc/xls/ppt

  return null;
}

/**
 * Do the bytes agree with the declared type? An unrecognised signature passes
 * only for the formats that legitimately have none.
 */
export function bytesMatchKind(bytes: Uint8Array, kind: MediaKind, mimeType: string): boolean {
  const sniffed = sniffKind(bytes);
  if (sniffed) return sniffed === kind;
  const mime = mimeType.split(";")[0].trim().toLowerCase();
  return kind === "document" && (mime === "text/plain" || mime === "text/csv");
}

/**
 * Object key for an attachment. Scoped by tenant and conversation so a stray
 * path in a send request can be rejected by prefix alone, and so clearing a
 * conversation's media is a single prefix delete.
 */
export function buildMediaPath(
  tenantId: string,
  conversationId: string,
  id: string,
  mimeType: string
): string {
  return `${tenantId}/${conversationId}/${id}.${extensionFor(mimeType)}`;
}

/** Is this path one the given visitor's token is allowed to attach? */
export function isPathInConversation(
  path: string,
  tenantId: string,
  conversationId: string
): boolean {
  if (!path || path.includes("..") || path.startsWith("/")) return false;
  return path.startsWith(`${tenantId}/${conversationId}/`);
}
