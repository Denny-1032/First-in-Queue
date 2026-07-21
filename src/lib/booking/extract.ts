import OpenAI from "openai";
import { nowInTimezone } from "@/lib/booking/availability";

export interface ExtractedBooking {
  date?: string; // YYYY-MM-DD
  time?: string; // HH:MM
  name?: string;
  type?: string;
  notes?: string;
}

/**
 * Turn messy flow question/answer pairs (keys are truncated question text)
 * into structured booking fields. Relative dates ("tomorrow", "next Friday")
 * are resolved against today in the tenant's timezone.
 */
export async function extractBookingFromCollectedData(
  collected: Record<string, string>,
  opts: { apiKey?: string; timezone?: string } = {}
): Promise<ExtractedBooking | null> {
  if (Object.keys(collected).length === 0) return null;

  try {
    const openai = new OpenAI({ apiKey: opts.apiKey || process.env.OPENAI_API_KEY });
    const now = nowInTimezone(opts.timezone);
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const weekday = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][now.getDay()];

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0,
      max_tokens: 200,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `Today is ${weekday}, ${todayStr}. Extract appointment booking fields from question/answer pairs collected in a chat. Resolve relative dates ("tomorrow", "next Friday") to YYYY-MM-DD. Times as 24h HH:MM. Return JSON: {"date": "YYYY-MM-DD" | null, "time": "HH:MM" | null, "name": string | null, "type": string | null, "notes": string | null}. Only extract what is clearly present.`,
        },
        { role: "user", content: JSON.stringify(collected) },
      ],
    });

    return normalizeExtracted(completion.choices[0]?.message?.content);
  } catch (error) {
    console.error("[BookingExtract] Extraction failed:", error);
    return null;
  }
}

/**
 * Post-call safety net for voice: pull an appointment out of a raw call transcript.
 * Only returns a booking when the caller clearly agreed to a specific date (and
 * usually a time) - so we don't create phantom bookings from general enquiries.
 */
export async function extractBookingFromTranscript(
  transcript: string,
  opts: { apiKey?: string; timezone?: string } = {}
): Promise<ExtractedBooking | null> {
  if (!transcript || transcript.trim().length < 20) return null;

  try {
    const openai = new OpenAI({ apiKey: opts.apiKey || process.env.OPENAI_API_KEY });
    const now = nowInTimezone(opts.timezone);
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const weekday = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][now.getDay()];

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0,
      max_tokens: 200,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `Today is ${weekday}, ${todayStr}. You read a phone call transcript between an AI agent and a caller. If - and ONLY if - the caller agreed to schedule an appointment at a specific date, extract it. If no appointment was actually agreed (just an enquiry, a cancellation, or vague talk), return all nulls. Resolve relative dates ("tomorrow", "next Friday") to YYYY-MM-DD. Times as 24h HH:MM. Return JSON: {"date": "YYYY-MM-DD" | null, "time": "HH:MM" | null, "name": string | null, "type": string | null, "notes": string | null}.`,
        },
        { role: "user", content: transcript.slice(0, 8000) },
      ],
    });

    return normalizeExtracted(completion.choices[0]?.message?.content);
  } catch (error) {
    console.error("[BookingExtract] Transcript extraction failed:", error);
    return null;
  }
}

function normalizeExtracted(content: string | null | undefined): ExtractedBooking {
  const parsed = JSON.parse(content || "{}");
  return {
    date: typeof parsed.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(parsed.date) ? parsed.date : undefined,
    time: typeof parsed.time === "string" && /^\d{2}:\d{2}/.test(parsed.time) ? parsed.time.slice(0, 5) : undefined,
    name: typeof parsed.name === "string" && parsed.name ? parsed.name : undefined,
    type: typeof parsed.type === "string" && parsed.type ? parsed.type : undefined,
    notes: typeof parsed.notes === "string" && parsed.notes ? parsed.notes : undefined,
  };
}
