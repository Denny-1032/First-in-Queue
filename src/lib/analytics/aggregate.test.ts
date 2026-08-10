import { describe, it, expect } from "vitest";
import {
  sentimentBreakdown,
  topTopics,
  avgFirstReplySeconds,
  answeredVsMissed,
  hourlyVolume,
  aiResolutionRate,
  type MessageRow,
} from "./aggregate";

describe("sentimentBreakdown", () => {
  it("returns percentages, not counts", () => {
    // The bug this replaced: three positive conversations were rendered as
    // "3%" because the UI put a % sign on a raw count.
    const { breakdown, sampleSize } = sentimentBreakdown([
      { sentiment: "positive" },
      { sentiment: "positive" },
      { sentiment: "positive" },
      { sentiment: "negative" },
    ]);
    expect(breakdown).toEqual({ positive: 75, neutral: 0, negative: 25 });
    expect(sampleSize).toBe(4);
  });

  it("ignores conversations with no sentiment rather than counting them neutral", () => {
    const { breakdown, sampleSize } = sentimentBreakdown([
      { sentiment: "positive" },
      { sentiment: null },
      { sentiment: undefined },
    ]);
    expect(breakdown.positive).toBe(100);
    expect(sampleSize).toBe(1);
  });

  it("reports an empty sample instead of dividing by zero", () => {
    const { breakdown, sampleSize } = sentimentBreakdown([]);
    expect(breakdown).toEqual({ positive: 0, neutral: 0, negative: 0 });
    expect(sampleSize).toBe(0);
  });
});

describe("topTopics", () => {
  it("counts intents across conversations, most common first", () => {
    expect(
      topTopics([
        { tags: ["order_status"] },
        { tags: ["order_status", "refund"] },
        { tags: ["refund"] },
        { tags: ["order_status"] },
      ])
    ).toEqual([
      { topic: "Order status", count: 3 },
      { topic: "Refund", count: 2 },
    ]);
  });

  it("drops the model's 'other' fallback - it is not a topic", () => {
    expect(topTopics([{ tags: ["other"] }, { tags: ["Other"] }, { tags: ["pricing"] }])).toEqual([
      { topic: "Pricing", count: 1 },
    ]);
  });

  it("survives missing and empty tag arrays", () => {
    expect(topTopics([{}, { tags: null }, { tags: [] }, { tags: ["  "] }])).toEqual([]);
  });
});

describe("avgFirstReplySeconds", () => {
  const at = (iso: string, conversation_id: string, direction: "inbound" | "outbound"): MessageRow => ({
    conversation_id,
    direction,
    created_at: iso,
  });

  it("averages the gap between the first question and the first reply", () => {
    const { seconds, sampleSize } = avgFirstReplySeconds([
      at("2026-08-10T10:00:00Z", "c1", "inbound"),
      at("2026-08-10T10:00:20Z", "c1", "outbound"),
      at("2026-08-10T11:00:00Z", "c2", "inbound"),
      at("2026-08-10T11:00:40Z", "c2", "outbound"),
    ]);
    expect(seconds).toBe(30);
    expect(sampleSize).toBe(2);
  });

  it("ignores an unanswered conversation instead of scoring it as instant", () => {
    const { seconds, sampleSize } = avgFirstReplySeconds([
      at("2026-08-10T10:00:00Z", "c1", "inbound"),
      at("2026-08-10T10:00:10Z", "c1", "outbound"),
      at("2026-08-10T12:00:00Z", "c2", "inbound"),
    ]);
    expect(seconds).toBe(10);
    expect(sampleSize).toBe(1);
  });

  it("ignores an outbound that came before the customer ever wrote", () => {
    // A proactive/outbound-first conversation must not produce a negative time.
    const { seconds, sampleSize } = avgFirstReplySeconds([
      at("2026-08-10T09:00:00Z", "c1", "outbound"),
      at("2026-08-10T10:00:00Z", "c1", "inbound"),
      at("2026-08-10T10:00:15Z", "c1", "outbound"),
    ]);
    expect(seconds).toBe(15);
    expect(sampleSize).toBe(1);
  });

  it("is order-independent - rows arrive newest first from the database", () => {
    const rows = [
      at("2026-08-10T10:00:20Z", "c1", "outbound"),
      at("2026-08-10T10:00:00Z", "c1", "inbound"),
    ];
    expect(avgFirstReplySeconds(rows).seconds).toBe(20);
  });

  it("returns an empty sample when nothing has been answered", () => {
    expect(avgFirstReplySeconds([])).toEqual({ seconds: 0, sampleSize: 0 });
  });
});

describe("answeredVsMissed", () => {
  const row = (conversation_id: string, direction: "inbound" | "outbound"): MessageRow => ({
    conversation_id,
    direction,
    created_at: "2026-08-10T10:00:00Z",
  });

  it("counts a conversation as missed only when nothing went back out", () => {
    const { answered, missed } = answeredVsMissed([
      row("c1", "inbound"),
      row("c1", "outbound"),
      row("c2", "inbound"),
      row("c3", "inbound"),
      row("c3", "outbound"),
    ]);
    expect(answered).toBe(2);
    expect(missed).toBe(1);
  });

  it("ignores outbound-only conversations - nobody asked anything", () => {
    expect(answeredVsMissed([row("c1", "outbound")])).toEqual({ answered: 0, missed: 0 });
  });
});

describe("hourlyVolume", () => {
  it("buckets only the requested day, in local hours", () => {
    const day = new Date(2026, 7, 10, 12, 0, 0);
    const sameDay = new Date(2026, 7, 10, 9, 30, 0).toISOString();
    const otherDay = new Date(2026, 7, 9, 9, 30, 0).toISOString();

    const buckets = hourlyVolume(
      [
        { conversation_id: "c1", direction: "inbound", created_at: sameDay },
        { conversation_id: "c1", direction: "outbound", created_at: sameDay },
        { conversation_id: "c2", direction: "inbound", created_at: otherDay },
      ],
      day
    );

    expect(buckets).toHaveLength(24);
    expect(buckets[9].count).toBe(2);
    expect(buckets.reduce((n, b) => n + b.count, 0)).toBe(2);
  });
});

describe("aiResolutionRate", () => {
  it("is the share of resolved conversations no human was assigned to", () => {
    const { rate, sampleSize } = aiResolutionRate([
      { status: "resolved", assigned_agent_id: null },
      { status: "resolved", assigned_agent_id: null },
      { status: "resolved", assigned_agent_id: "agent-1" },
      { status: "active", assigned_agent_id: null },
    ]);
    expect(rate).toBe(66.7);
    expect(sampleSize).toBe(3);
  });

  it("reports an empty sample rather than 0% when nothing is resolved yet", () => {
    expect(aiResolutionRate([{ status: "active" }])).toEqual({ rate: 0, sampleSize: 0 });
  });
});
