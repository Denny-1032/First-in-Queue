// =============================================
// Analytics aggregation
// ---------------------------------------------
// Pure functions over rows already fetched by getAnalytics. Kept separate from
// the queries so the arithmetic can be tested without a database, and so the
// query layer stays one obvious list of fetches.
//
// Every number here is derived from real rows. Nothing returns a placeholder:
// where there is no data the caller gets 0 with a sample size beside it, so the
// UI can say "no data yet" instead of showing a confident zero.
// =============================================

export interface ConversationRow {
  sentiment?: string | null;
  tags?: string[] | null;
  status?: string | null;
  assigned_agent_id?: string | null;
}

export interface MessageRow {
  conversation_id: string;
  direction: "inbound" | "outbound";
  created_at: string;
}

export interface SentimentBreakdown {
  positive: number;
  neutral: number;
  negative: number;
}

/**
 * Sentiment as PERCENTAGES of the conversations that have one.
 *
 * This used to return raw counts while the dashboard rendered them with a "%"
 * sign - three happy conversations were displayed as "3%". Percentages are what
 * the label promises, so percentages are what this returns; `sampleSize` tells
 * the caller how many conversations they are a percentage of.
 */
export function sentimentBreakdown(rows: ConversationRow[]): {
  breakdown: SentimentBreakdown;
  sampleSize: number;
} {
  const counts: SentimentBreakdown = { positive: 0, neutral: 0, negative: 0 };
  let total = 0;

  for (const row of rows) {
    const s = row.sentiment;
    if (s === "positive" || s === "neutral" || s === "negative") {
      counts[s]++;
      total++;
    }
  }

  if (total === 0) return { breakdown: counts, sampleSize: 0 };

  return {
    breakdown: {
      positive: Math.round((counts.positive / total) * 100),
      neutral: Math.round((counts.neutral / total) * 100),
      negative: Math.round((counts.negative / total) * 100),
    },
    sampleSize: total,
  };
}

/**
 * What customers actually asked about, from the intents the AI engine detects
 * and the handler stores on `conversations.tags`.
 *
 * "other" is the engine's fallback when it could not classify the message. It
 * is not a topic, so it never becomes one on screen.
 */
export function topTopics(
  rows: ConversationRow[],
  limit = 5
): Array<{ topic: string; count: number }> {
  const counts = new Map<string, number>();

  for (const row of rows) {
    for (const raw of row.tags || []) {
      const tag = String(raw).trim();
      if (!tag || tag.toLowerCase() === "other") continue;
      counts.set(tag, (counts.get(tag) || 0) + 1);
    }
  }

  return [...counts.entries()]
    .map(([topic, count]) => ({ topic: humanizeTopic(topic), count }))
    .sort((a, b) => b.count - a.count || a.topic.localeCompare(b.topic))
    .slice(0, limit);
}

/** "order_status" / "order-status" -> "Order status" */
function humanizeTopic(tag: string): string {
  const words = tag.replace(/[_-]+/g, " ").trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/**
 * Average seconds between a customer's first message in a conversation and the
 * first reply that went back to them.
 *
 * Pairs first-inbound with first-later-outbound per conversation. Conversations
 * that were never answered contribute nothing to the average rather than
 * counting as zero - an unanswered chat is a missed chat, which is reported
 * separately, not an instant reply.
 */
export function avgFirstReplySeconds(messages: MessageRow[]): {
  seconds: number;
  sampleSize: number;
} {
  const firstInbound = new Map<string, number>();
  const firstReply = new Map<string, number>();

  for (const m of messages) {
    const t = new Date(m.created_at).getTime();
    if (Number.isNaN(t)) continue;

    if (m.direction === "inbound") {
      const seen = firstInbound.get(m.conversation_id);
      if (seen === undefined || t < seen) firstInbound.set(m.conversation_id, t);
    }
  }

  for (const m of messages) {
    if (m.direction !== "outbound") continue;
    const asked = firstInbound.get(m.conversation_id);
    if (asked === undefined) continue;
    const t = new Date(m.created_at).getTime();
    // Only a reply that came AFTER the question counts.
    if (Number.isNaN(t) || t < asked) continue;
    const seen = firstReply.get(m.conversation_id);
    if (seen === undefined || t < seen) firstReply.set(m.conversation_id, t);
  }

  let total = 0;
  let n = 0;
  for (const [conversationId, replied] of firstReply) {
    const asked = firstInbound.get(conversationId);
    if (asked === undefined) continue;
    total += (replied - asked) / 1000;
    n++;
  }

  return { seconds: n === 0 ? 0 : Math.round(total / n), sampleSize: n };
}

/**
 * Of the conversations a customer wrote into during this window, how many got
 * a reply and how many are still sitting there unanswered.
 *
 * "Answered" means something went back out - by the AI or by a human. This is
 * the number that tells an owner whether the business is keeping up, which is
 * why it belongs on the dashboard home rather than buried in analytics.
 */
export function answeredVsMissed(messages: MessageRow[]): {
  answered: number;
  missed: number;
} {
  const asked = new Set<string>();
  const replied = new Set<string>();

  for (const m of messages) {
    if (m.direction === "inbound") asked.add(m.conversation_id);
    else replied.add(m.conversation_id);
  }

  let answered = 0;
  for (const id of asked) if (replied.has(id)) answered++;

  return { answered, missed: asked.size - answered };
}

/** Message counts per hour of the given local day. */
export function hourlyVolume(
  messages: MessageRow[],
  day: Date
): Array<{ hour: number; count: number }> {
  const buckets = Array.from({ length: 24 }, (_, hour) => ({ hour, count: 0 }));
  const dayKey = day.toDateString();

  for (const m of messages) {
    const d = new Date(m.created_at);
    if (Number.isNaN(d.getTime()) || d.toDateString() !== dayKey) continue;
    buckets[d.getHours()].count++;
  }

  return buckets;
}

/**
 * Resolved without a human ever being assigned, as a percentage of resolved
 * conversations. 0 when nothing has been resolved yet - `sampleSize` is what
 * distinguishes "nothing resolved" from "nothing resolved by AI".
 */
export function aiResolutionRate(rows: ConversationRow[]): {
  rate: number;
  sampleSize: number;
} {
  const resolved = rows.filter((r) => r.status === "resolved");
  if (resolved.length === 0) return { rate: 0, sampleSize: 0 };
  const byAi = resolved.filter((r) => !r.assigned_agent_id).length;
  return { rate: Math.round((byAi / resolved.length) * 1000) / 10, sampleSize: resolved.length };
}
