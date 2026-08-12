import { describe, it, expect } from "vitest";
import { extractDocumentText } from "./media-extract";
import { MAX_EXTRACT_CHARS } from "./media";

/**
 * A minimal but genuinely valid single-page PDF, built by hand so the test has
 * no fixture file and no dependency on how one was generated. The page draws
 * one text run: "Hello from a real PDF".
 */
function buildPdf(body = "Hello from a real PDF"): Uint8Array {
  const content = `BT /F1 24 Tf 72 700 Td (${body}) Tj ET`;
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];
  objects.forEach((obj, i) => {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${obj}\nendobj\n`;
  });

  const xrefStart = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const off of offsets) pdf += `${String(off).padStart(10, "0")} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;

  return new TextEncoder().encode(pdf);
}

describe("extractDocumentText", () => {
  it("reads the text out of a PDF", async () => {
    const text = await extractDocumentText(buildPdf(), "application/pdf");
    expect(text).toContain("Hello from a real PDF");
  });

  it("reads plain text and CSV", async () => {
    const bytes = new TextEncoder().encode("name,total\nMwape,K1200\n");
    expect(await extractDocumentText(bytes, "text/csv")).toBe("name,total\nMwape,K1200");
    expect(await extractDocumentText(bytes, "text/plain; charset=utf-8")).toContain("Mwape");
  });

  it("collapses the whitespace pdf.js and text files scatter about", async () => {
    const bytes = new TextEncoder().encode("a   \t b\r\n\n\n\nc");
    expect(await extractDocumentText(bytes, "text/plain")).toBe("a b\n\nc");
  });

  it("truncates rather than letting one file fill the model's window", async () => {
    const bytes = new TextEncoder().encode("x".repeat(MAX_EXTRACT_CHARS + 500));
    const text = await extractDocumentText(bytes, "text/plain");
    expect(text!.length).toBeLessThanOrEqual(MAX_EXTRACT_CHARS + 20);
    expect(text).toContain("[truncated]");
  });

  it("returns null for formats we do not read", async () => {
    const docx = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x00]);
    expect(
      await extractDocumentText(
        docx,
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      )
    ).toBeNull();
  });

  it("returns null instead of throwing on an unreadable PDF", async () => {
    const junk = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x00, 0x01, 0x02]);
    expect(await extractDocumentText(junk, "application/pdf")).toBeNull();
  });

  it("returns null for an empty file", async () => {
    expect(await extractDocumentText(new Uint8Array(0), "text/plain")).toBeNull();
  });
});
