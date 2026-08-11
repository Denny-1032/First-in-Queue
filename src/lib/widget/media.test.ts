import { describe, it, expect } from "vitest";
import {
  MAX_UPLOAD_BYTES,
  buildMediaPath,
  bytesMatchKind,
  checkUpload,
  extensionFor,
  formatBytes,
  isPathInConversation,
  mediaKindFor,
  sanitizeFilename,
  sniffKind,
} from "./media";

const TENANT = "11111111-1111-1111-1111-111111111111";
const CONVO = "22222222-2222-2222-2222-222222222222";

function bytes(...values: number[]): Uint8Array {
  return new Uint8Array(values);
}

describe("mediaKindFor", () => {
  it("classifies the supported families", () => {
    expect(mediaKindFor("image/png")).toBe("image");
    expect(mediaKindFor("application/pdf")).toBe("document");
  });

  it("ignores charset parameters and casing", () => {
    expect(mediaKindFor("TEXT/CSV; charset=utf-8")).toBe("document");
  });

  it("rejects SVG - it is scriptable and we render attachments inline", () => {
    expect(mediaKindFor("image/svg+xml")).toBeNull();
  });

  it("rejects executables and unknown types", () => {
    expect(mediaKindFor("application/x-msdownload")).toBeNull();
    expect(mediaKindFor("")).toBeNull();
  });
});

describe("checkUpload", () => {
  it("accepts an ordinary image", () => {
    const res = checkUpload({ name: "cat.png", type: "image/png", size: 2048 });
    expect(res).toEqual({ ok: true, kind: "image" });
  });

  it("rejects an empty file", () => {
    expect(checkUpload({ name: "x.pdf", type: "application/pdf", size: 0 }).ok).toBe(false);
  });

  it("rejects anything over the cap", () => {
    const res = checkUpload({
      name: "big.pdf",
      type: "application/pdf",
      size: MAX_UPLOAD_BYTES + 1,
    });
    expect(res.ok).toBe(false);
    expect(res.error).toContain("4.0 MB");
  });
});

describe("sniffKind / bytesMatchKind", () => {
  it("recognises the common signatures", () => {
    expect(sniffKind(bytes(0xff, 0xd8, 0xff, 0xe0))).toBe("image");
    expect(sniffKind(bytes(0x89, 0x50, 0x4e, 0x47))).toBe("image");
    expect(sniffKind(bytes(0x25, 0x50, 0x44, 0x46, 0x2d))).toBe("document");
    expect(sniffKind(bytes(0x50, 0x4b, 0x03, 0x04))).toBe("document");
  });

  it("returns null for signature-less content", () => {
    expect(sniffKind(bytes(0x68, 0x65, 0x6c, 0x6c, 0x6f))).toBeNull();
  });

  it("catches a document renamed as an image", () => {
    const pdf = bytes(0x25, 0x50, 0x44, 0x46, 0x2d);
    expect(bytesMatchKind(pdf, "image", "image/png")).toBe(false);
    expect(bytesMatchKind(pdf, "document", "application/pdf")).toBe(true);
  });

  it("lets plain text through, since it has no signature", () => {
    const text = bytes(0x68, 0x69);
    expect(bytesMatchKind(text, "document", "text/plain")).toBe(true);
    expect(bytesMatchKind(text, "document", "application/pdf")).toBe(false);
    expect(bytesMatchKind(text, "image", "image/png")).toBe(false);
  });
});

describe("sanitizeFilename", () => {
  it("strips directory components", () => {
    expect(sanitizeFilename("../../etc/passwd")).toBe("passwd");
    expect(sanitizeFilename("C:\\Users\\me\\quote.pdf")).toBe("quote.pdf");
  });

  it("drops control characters used to truncate paths", () => {
    expect(sanitizeFilename("invoice\u0000.exe")).toBe("invoice.exe");
  });

  it("falls back when nothing usable is left", () => {
    expect(sanitizeFilename("   ")).toBe("attachment");
    expect(sanitizeFilename("..")).toBe("attachment");
  });

  it("caps the length", () => {
    expect(sanitizeFilename("a".repeat(300))).toHaveLength(120);
  });
});

describe("buildMediaPath / isPathInConversation", () => {
  it("scopes objects by tenant and conversation", () => {
    const path = buildMediaPath(TENANT, CONVO, "abc", "image/jpeg");
    expect(path).toBe(`${TENANT}/${CONVO}/abc.jpg`);
    expect(isPathInConversation(path, TENANT, CONVO)).toBe(true);
  });

  it("rejects another conversation's object", () => {
    const other = buildMediaPath(TENANT, "33333333-3333-3333-3333-333333333333", "abc", "image/jpeg");
    expect(isPathInConversation(other, TENANT, CONVO)).toBe(false);
  });

  it("rejects traversal and absolute paths", () => {
    expect(isPathInConversation(`${TENANT}/${CONVO}/../../x.png`, TENANT, CONVO)).toBe(false);
    expect(isPathInConversation(`/${TENANT}/${CONVO}/x.png`, TENANT, CONVO)).toBe(false);
    expect(isPathInConversation("", TENANT, CONVO)).toBe(false);
  });
});

describe("extensionFor / formatBytes", () => {
  it("maps known types and falls back to .bin", () => {
    expect(extensionFor("application/vnd.openxmlformats-officedocument.wordprocessingml.document")).toBe("docx");
    expect(extensionFor("application/octet-stream")).toBe("bin");
  });

  it("formats sizes the way the composer shows them", () => {
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(2048)).toBe("2 KB");
    expect(formatBytes(3 * 1024 * 1024)).toBe("3.0 MB");
  });
});
