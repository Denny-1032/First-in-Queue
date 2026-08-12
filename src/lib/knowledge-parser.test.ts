import { describe, it, expect } from "vitest";
import { parseKnowledgeEntriesJson } from "./knowledge-parser";

const json = (v: unknown) => JSON.stringify(v);

describe("parseKnowledgeEntriesJson", () => {
  it("keeps well-formed entries and trims whitespace", () => {
    const { entries, skipped } = parseKnowledgeEntriesJson(
      json([{ topic: "  Name clearance ", content: "  Fee: K120. " }])
    );
    expect(skipped).toBe(0);
    expect(entries).toHaveLength(1);
    expect(entries[0].topic).toBe("Name clearance");
    expect(entries[0].content).toBe("Fee: K120.");
    expect(entries[0].id).toBeTruthy();
  });

  it("takes content verbatim - no truncation, no rewriting", () => {
    const content = "A published fee paragraph. ".repeat(200);
    const { entries } = parseKnowledgeEntriesJson(json([{ topic: "T", content }]));
    expect(entries[0].content).toBe(content.trim());
  });

  it("ignores extra keys such as source", () => {
    const { entries } = parseKnowledgeEntriesJson(
      json([{ topic: "T", content: "C", source: "https://www.pacra.org.zm/fees-and-forms" }])
    );
    expect(entries[0]).toEqual({ id: expect.any(String), topic: "T", content: "C", keywords: [] });
  });

  it("keeps string keywords and drops the rest", () => {
    const { entries } = parseKnowledgeEntriesJson(
      json([{ topic: "T", content: "C", keywords: ["form 1", 5, "name clearance", null] }])
    );
    expect(entries[0].keywords).toEqual(["form 1", "name clearance"]);

    const { entries: notAnArray } = parseKnowledgeEntriesJson(
      json([{ topic: "T", content: "C", keywords: "nope" }])
    );
    expect(notAnArray[0].keywords).toEqual([]);
  });

  it("preserves a supplied id but generates one when missing", () => {
    const [withId] = parseKnowledgeEntriesJson(json([{ id: "kb_kept", topic: "T", content: "C" }])).entries;
    expect(withId.id).toBe("kb_kept");
    const [generated] = parseKnowledgeEntriesJson(json([{ topic: "T", content: "C" }])).entries;
    expect(generated.id).toMatch(/^kb_/);
  });

  it("skips entries missing topic or content, and counts them", () => {
    const { entries, skipped } = parseKnowledgeEntriesJson(
      json([
        { topic: "Good", content: "C" },
        { topic: "", content: "C" },
        { topic: "T", content: "   " },
        { topic: 5, content: "C" },
        "not an object",
        null,
      ])
    );
    expect(entries).toHaveLength(1);
    expect(skipped).toBe(5);
  });

  it("imports past the free-tier onboarding caps - a real KB is bigger than 50 entries", () => {
    const many = Array.from({ length: 98 }, (_, i) => ({ topic: `T${i}`, content: "x".repeat(300) }));
    const { entries, skipped } = parseKnowledgeEntriesJson(json(many));
    expect(entries).toHaveLength(98);
    expect(skipped).toBe(0);
  });

  it("generates unique ids across an import", () => {
    const many = Array.from({ length: 20 }, (_, i) => ({ topic: `T${i}`, content: "C" }));
    const { entries } = parseKnowledgeEntriesJson(json(many));
    expect(new Set(entries.map((e) => e.id)).size).toBe(20);
  });

  it("throws on invalid JSON", () => {
    expect(() => parseKnowledgeEntriesJson("{not json")).toThrow(/valid JSON/);
  });

  it("throws on a non-array root", () => {
    expect(() => parseKnowledgeEntriesJson(json({ topic: "T", content: "C" }))).toThrow(/array/);
    expect(() => parseKnowledgeEntriesJson(json("a string"))).toThrow(/array/);
  });

  it("returns nothing for an empty array", () => {
    expect(parseKnowledgeEntriesJson("[]")).toEqual({ entries: [], skipped: 0 });
  });
});
