import { describe, it, expect, vi, beforeEach } from "vitest";
import type { KnowledgeEntry } from "@/types";

// Mock the OpenAI SDK before importing the module under test. `mockCreate` is
// hoisted with the factory so each test can set the next completion.
const { mockCreate } = vi.hoisted(() => ({ mockCreate: vi.fn() }));

vi.mock("openai", () => ({
  default: class {
    chat = { completions: { create: mockCreate } };
  },
}));

const { generateFaqs } = await import("./faq-generator");

const entries: KnowledgeEntry[] = [
  { id: "1", topic: "Hours", content: "Open 8am to 6pm Monday to Saturday.", keywords: [] },
];

/** Shape a chat.completions.create result carrying `content` as the message body. */
const completion = (content: string) => ({ choices: [{ message: { content } }] });

describe("generateFaqs", () => {
  beforeEach(() => {
    mockCreate.mockReset();
  });

  it("returns [] without calling the API when there are no entries", async () => {
    await expect(generateFaqs([], { apiKey: "sk-test" })).resolves.toEqual([]);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("returns [] without calling the API when no key is available", async () => {
    const previous = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;
    await expect(generateFaqs(entries)).resolves.toEqual([]);
    expect(mockCreate).not.toHaveBeenCalled();
    if (previous !== undefined) process.env.OPENAI_API_KEY = previous;
  });

  it("parses well-formed FAQs and assigns ids", async () => {
    mockCreate.mockResolvedValue(
      completion(JSON.stringify({ faqs: [{ question: " Hours? ", answer: " 8am-6pm. " }] }))
    );
    const out = await generateFaqs(entries, { apiKey: "sk-test" });
    expect(out).toHaveLength(1);
    expect(out[0].question).toBe("Hours?");
    expect(out[0].answer).toBe("8am-6pm.");
    expect(out[0].id).toMatch(/^faq_/);
  });

  it("requests JSON mode so the response is parseable", async () => {
    mockCreate.mockResolvedValue(completion(JSON.stringify({ faqs: [] })));
    await generateFaqs(entries, { apiKey: "sk-test" });
    expect(mockCreate.mock.calls[0][0].response_format).toEqual({ type: "json_object" });
  });

  it("returns [] on malformed JSON instead of throwing", async () => {
    mockCreate.mockResolvedValue(completion("not json at all"));
    await expect(generateFaqs(entries, { apiKey: "sk-test" })).resolves.toEqual([]);
  });

  it("returns [] when the API throws", async () => {
    mockCreate.mockRejectedValue(new Error("429 rate limited"));
    await expect(generateFaqs(entries, { apiKey: "sk-test" })).resolves.toEqual([]);
  });

  it("returns [] when the payload has no faqs array", async () => {
    mockCreate.mockResolvedValue(completion(JSON.stringify({ faqs: "nope" })));
    await expect(generateFaqs(entries, { apiKey: "sk-test" })).resolves.toEqual([]);
  });

  it("returns [] when the message has no content", async () => {
    mockCreate.mockResolvedValue({ choices: [{ message: {} }] });
    await expect(generateFaqs(entries, { apiKey: "sk-test" })).resolves.toEqual([]);
  });

  it("skips items missing a question or answer", async () => {
    mockCreate.mockResolvedValue(
      completion(
        JSON.stringify({
          faqs: [
            { question: "Only q" },
            { answer: "Only a" },
            { question: "Good", answer: "Kept" },
          ],
        })
      )
    );
    const out = await generateFaqs(entries, { apiKey: "sk-test" });
    expect(out).toHaveLength(1);
    expect(out[0].question).toBe("Good");
  });

  it("caps output at 8 FAQs", async () => {
    mockCreate.mockResolvedValue(
      completion(
        JSON.stringify({
          faqs: Array.from({ length: 20 }, (_, i) => ({ question: `Q${i}`, answer: `A${i}` })),
        })
      )
    );
    const out = await generateFaqs(entries, { apiKey: "sk-test" });
    expect(out).toHaveLength(8);
  });

  it("truncates over-long question and answer text", async () => {
    mockCreate.mockResolvedValue(
      completion(
        JSON.stringify({ faqs: [{ question: "q".repeat(500), answer: "a".repeat(3000) }] })
      )
    );
    const [out] = await generateFaqs(entries, { apiKey: "sk-test" });
    expect(out.question).toHaveLength(300);
    expect(out.answer).toHaveLength(1000);
  });

  it("caps how much crawl content is sent to the model", async () => {
    mockCreate.mockResolvedValue(completion(JSON.stringify({ faqs: [] })));
    const huge: KnowledgeEntry[] = [
      { id: "1", topic: "Big", content: "x".repeat(50_000), keywords: [] },
    ];
    await generateFaqs(huge, { apiKey: "sk-test" });
    const userMessage = mockCreate.mock.calls[0][0].messages[1].content as string;
    expect(userMessage.length).toBeLessThanOrEqual(12_000 + 100);
  });
});
