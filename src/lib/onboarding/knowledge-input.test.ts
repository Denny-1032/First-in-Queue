import { describe, it, expect } from "vitest";
import {
  cleanFaqs,
  cleanKnowledge,
  FREE_KB_CAP_BYTES,
  MAX_FAQS,
  MAX_KB_ENTRIES,
} from "./knowledge-input";

const kb = (topic: string, content: string, extra: Record<string, unknown> = {}) => ({
  topic,
  content,
  ...extra,
});

describe("cleanFaqs", () => {
  it("keeps well-formed FAQs and trims whitespace", () => {
    const out = cleanFaqs([{ question: "  Do you deliver? ", answer: "  Yes, within 10km. " }]);
    expect(out).toHaveLength(1);
    expect(out[0].question).toBe("Do you deliver?");
    expect(out[0].answer).toBe("Yes, within 10km.");
    expect(out[0].id).toBeTruthy();
  });

  it("preserves a supplied id but generates one when missing", () => {
    const [withId] = cleanFaqs([{ id: "faq_kept", question: "Q", answer: "A" }]);
    expect(withId.id).toBe("faq_kept");
    const [generated] = cleanFaqs([{ question: "Q", answer: "A" }]);
    expect(generated.id).toMatch(/^faq_/);
  });

  it("drops entries missing a question or an answer", () => {
    expect(
      cleanFaqs([
        { question: "Q only" },
        { answer: "A only" },
        { question: "  ", answer: "blank question" },
        { question: "Good", answer: "Kept" },
      ])
    ).toHaveLength(1);
  });

  it("ignores non-array and non-object input", () => {
    expect(cleanFaqs(undefined)).toEqual([]);
    expect(cleanFaqs("nope")).toEqual([]);
    expect(cleanFaqs([null, 42, "x"])).toEqual([]);
  });

  it("truncates over-long fields rather than rejecting them", () => {
    const [out] = cleanFaqs([{ question: "q".repeat(500), answer: "a".repeat(2000) }]);
    expect(out.question).toHaveLength(300);
    expect(out.answer).toHaveLength(1000);
  });

  it("caps the number of FAQs", () => {
    const many = Array.from({ length: MAX_FAQS + 10 }, (_, i) => ({
      question: `Q${i}`,
      answer: `A${i}`,
    }));
    expect(cleanFaqs(many)).toHaveLength(MAX_FAQS);
  });

  it("keeps a category only when it is a non-empty string", () => {
    expect(cleanFaqs([{ question: "Q", answer: "A", category: "Billing" }])[0].category).toBe(
      "Billing"
    );
    expect(cleanFaqs([{ question: "Q", answer: "A", category: 7 }])[0].category).toBeUndefined();
  });
});

describe("cleanKnowledge", () => {
  it("keeps entries that fit the byte budget", () => {
    const { kept, dropped } = cleanKnowledge([
      kb("Parking", "Free on-site parking."),
      kb("Hours", "8am-6pm Monday to Saturday."),
    ]);
    expect(kept).toHaveLength(2);
    expect(dropped).toBe(0);
  });

  it("drops entries once the 4KB cap is exceeded and counts them", () => {
    const { kept, dropped } = cleanKnowledge([
      kb("Small", "fits"),
      kb("Huge", "x".repeat(FREE_KB_CAP_BYTES + 1)),
      kb("Also dropped", "y".repeat(FREE_KB_CAP_BYTES)),
    ]);
    expect(kept.map((k) => k.topic)).toEqual(["Small"]);
    expect(dropped).toBe(2);
  });

  it("always keeps the first valid entry even when it alone exceeds the cap", () => {
    const { kept, dropped } = cleanKnowledge([kb("Oversized", "x".repeat(FREE_KB_CAP_BYTES * 2))]);
    expect(kept).toHaveLength(1);
    expect(dropped).toBe(0);
  });

  it("measures bytes, not characters, so multi-byte content counts correctly", () => {
    // Each emoji is 4 UTF-8 bytes; 1200 of them exceed the 4096-byte budget.
    const { kept, dropped } = cleanKnowledge([kb("First", "a"), kb("Emoji", "😀".repeat(1200))]);
    expect(kept.map((k) => k.topic)).toEqual(["First"]);
    expect(dropped).toBe(1);
  });

  it("does not truncate kept content (only the cap decides)", () => {
    const content = "z".repeat(1000);
    const { kept } = cleanKnowledge([kb("Topic", content)]);
    expect(kept[0].content).toBe(content);
  });

  it("drops malformed entries without counting them against the cap", () => {
    const { kept, dropped } = cleanKnowledge([
      null,
      { topic: "No content" },
      { content: "No topic" },
      kb("Real", "kept"),
    ]);
    expect(kept.map((k) => k.topic)).toEqual(["Real"]);
    expect(dropped).toBe(0);
  });

  it("normalizes keywords to a string array", () => {
    const { kept } = cleanKnowledge([kb("T", "c", { keywords: ["a", 5, "b", null] })]);
    expect(kept[0].keywords).toEqual(["a", "b"]);
    const { kept: noKeywords } = cleanKnowledge([kb("T", "c", { keywords: "nope" })]);
    expect(noKeywords[0].keywords).toEqual([]);
  });

  it("caps the entry count and reports the overflow as dropped", () => {
    const many = Array.from({ length: MAX_KB_ENTRIES + 5 }, (_, i) => kb(`T${i}`, "x"));
    const { kept, dropped } = cleanKnowledge(many);
    expect(kept).toHaveLength(MAX_KB_ENTRIES);
    expect(dropped).toBe(5);
  });

  it("ignores non-array input", () => {
    expect(cleanKnowledge(undefined)).toEqual({ kept: [], dropped: 0 });
    expect(cleanKnowledge({ topic: "x" })).toEqual({ kept: [], dropped: 0 });
  });
});
