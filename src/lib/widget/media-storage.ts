import { getSupabaseAdmin } from "@/lib/supabase/server";
import { MEDIA_BUCKET } from "./media";
import type { Message, MessageContent } from "@/types";

// =============================================
// Chat attachments: private storage, signed on read
// ---------------------------------------------
// The `chat-media` bucket (migration 024) is PRIVATE — a visitor's ID scan or
// invoice must not be readable by anyone who guesses a URL, and the bucket is
// written to by unauthenticated visitors, so a public bucket would also be an
// open file host. Messages therefore store `content.media_path` (the object
// key) and every reader mints a short-lived signed URL:
//
//   /api/widget/history          → the visitor's own transcript
//   /api/conversations/:id/msgs  → the agent dashboard
//
// Signing is server-side only; the service role key never leaves the server.
// =============================================

/** How long a minted URL stays valid. Long enough to outlive an open panel. */
const SIGNED_URL_TTL_SECONDS = 60 * 60 * 6;

/** Server-side truth for whether the bucket is reachable, for clearer errors. */
export class MediaBucketMissingError extends Error {
  constructor() {
    super(
      `Storage bucket "${MEDIA_BUCKET}" does not exist. Run supabase/migrations/024_chat_media.sql.`
    );
    this.name = "MediaBucketMissingError";
  }
}

export function isBucketMissing(message: string | undefined): boolean {
  return !!message && /bucket not found/i.test(message);
}

/**
 * Sign one object key. Returns null when the object is gone or the bucket does
 * not exist — callers render the message without its attachment rather than
 * failing the whole transcript.
 */
export async function signMediaPath(path: string): Promise<string | null> {
  const { data, error } = await getSupabaseAdmin()
    .storage.from(MEDIA_BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);

  if (error || !data?.signedUrl) {
    console.error("[Media] sign failed:", path, error?.message);
    return null;
  }
  return data.signedUrl;
}

/** Does this object actually exist? Used before a path is written to a message. */
export async function mediaObjectExists(path: string): Promise<boolean> {
  return (await signMediaPath(path)) !== null;
}

type ContentCarrier = { content?: MessageContent | null };

/**
 * Fill in `content.media_url` for every message that carries a `media_path`,
 * in one batched signing call. Mutates nothing: returns new objects.
 *
 * Messages that already have a media_url (bot-sent images, WhatsApp media) are
 * left exactly as they are.
 */
export async function withSignedMedia<T extends ContentCarrier>(messages: T[]): Promise<T[]> {
  const paths = Array.from(
    new Set(
      messages
        .map((m) => m.content?.media_path)
        .filter((p): p is string => typeof p === "string" && p.length > 0)
    )
  );
  if (paths.length === 0) return messages;

  const signed = new Map<string, string>();
  try {
    const { data, error } = await getSupabaseAdmin()
      .storage.from(MEDIA_BUCKET)
      .createSignedUrls(paths, SIGNED_URL_TTL_SECONDS);

    if (error) {
      console.error("[Media] batch sign failed:", error.message);
    } else {
      for (const row of data || []) {
        if (row.signedUrl && row.path) signed.set(row.path, row.signedUrl);
      }
    }
  } catch (e) {
    console.error("[Media] batch sign threw:", e);
  }

  return messages.map((m) => {
    const path = m.content?.media_path;
    if (!path) return m;
    const url = signed.get(path);
    if (!url) return m;
    return { ...m, content: { ...m.content, media_url: url } };
  });
}

/** Convenience wrapper for the dashboard route, which deals in `Message` rows. */
export function withSignedMediaMessages(messages: Message[]): Promise<Message[]> {
  return withSignedMedia(messages);
}
