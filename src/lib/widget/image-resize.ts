// Browser-side image downscaling for the chat composer.
//
// Phone photos routinely run 4-12 MB, which the upload route cannot accept (see
// MAX_UPLOAD_BYTES — Vercel caps a function's request body at 4.5 MB). Shrinking
// in the tab is also just better: the visitor waits on a 200 KB upload instead
// of a 9 MB one, and the agent sees the same picture.
//
// Anything unexpected falls back to the original file — a photo that fails to
// decode here is better handled by the server's own size check than by a
// confusing client-side error.

const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.82;
/** Below this, re-encoding costs more than it saves. */
const SKIP_BELOW_BYTES = 600 * 1024;

/** Formats worth re-encoding. GIFs are excluded: a canvas keeps frame one only. */
function isResizable(type: string): boolean {
  return type === "image/jpeg" || type === "image/png" || type === "image/webp";
}

export async function downscaleImage(file: File): Promise<File> {
  if (typeof document === "undefined") return file;
  if (!isResizable(file.type) || file.size <= SKIP_BELOW_BYTES) return file;

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));

    // Already small enough in both dimensions and only mildly heavy: leave it.
    if (scale === 1 && file.size <= SKIP_BELOW_BYTES * 4) {
      bitmap.close();
      return file;
    }

    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close();
      return file;
    }
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY)
    );
    if (!blob || blob.size >= file.size) return file;

    const name = file.name.replace(/\.[^.]+$/, "") + ".jpg";
    return new File([blob], name, { type: "image/jpeg", lastModified: Date.now() });
  } catch {
    return file;
  }
}
