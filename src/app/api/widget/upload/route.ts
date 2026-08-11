import { NextRequest, NextResponse } from "next/server";
import { resolveByToken, widgetJson, corsHeaders, checkBurst } from "@/lib/properties/guard";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import {
  MEDIA_BUCKET,
  MAX_UPLOAD_BYTES,
  buildMediaPath,
  bytesMatchKind,
  checkUpload,
  sanitizeFilename,
} from "@/lib/widget/media";
import { isBucketMissing, signMediaPath } from "@/lib/widget/media-storage";
import crypto from "crypto";

// Visitor attachment upload for the web chat widget.
//
// Storing the file and SENDING it are two steps on purpose: the visitor picks a
// file, sees it upload, and can still change the caption or remove it before
// anything lands in the conversation. /api/widget/message then references the
// returned path — and re-checks that the path is inside the caller's own
// conversation, so an uploaded object cannot be attached to somebody else's.
//
// See docs/phase1-spec-widget-and-onboarding.md §6.

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(request.headers.get("origin")),
  });
}

export async function POST(request: NextRequest) {
  try {
    const guard = await resolveByToken(request);
    if (!guard.ok) return guard.response;
    const { origin, token } = guard;

    // Uploads are far more expensive than messages, so they get their own,
    // tighter buckets rather than sharing the message limiter.
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    if (!(await checkBurst(`upload:tok:${token.visitorId}`, 10, 300))) {
      return widgetJson({ error: "You're uploading too quickly" }, origin, { status: 429 });
    }
    if (!(await checkBurst(`upload:ip:${ip}`, 40, 600))) {
      return widgetJson({ error: "Too many requests" }, origin, { status: 429 });
    }

    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      return widgetJson({ error: "Invalid upload" }, origin, { status: 400 });
    }

    const file = form.get("file");
    if (!(file instanceof File)) {
      return widgetJson({ error: "No file provided" }, origin, { status: 400 });
    }

    const filename = sanitizeFilename(file.name || "attachment");
    const mimeType = (file.type || "").split(";")[0].trim().toLowerCase();

    // Declared-type gate. The browser ran the same check; this is the one that
    // counts, since the browser's can be skipped entirely.
    const check = checkUpload({ name: filename, type: mimeType, size: file.size });
    if (!check.ok || !check.kind) {
      return widgetJson({ error: check.error || "Unsupported file" }, origin, {
        status: file.size > MAX_UPLOAD_BYTES ? 413 : 415,
      });
    }

    const bytes = new Uint8Array(await file.arrayBuffer());

    // Content sniffing: a renamed executable is not a PDF just because the
    // Content-Type header says so, and these files are rendered inline in the
    // agent dashboard.
    if (!bytesMatchKind(bytes, check.kind, mimeType)) {
      return widgetJson(
        { error: "That file's contents don't match its type." },
        origin,
        { status: 415 }
      );
    }

    const path = buildMediaPath(
      token.tenantId,
      token.conversationId,
      crypto.randomUUID(),
      mimeType
    );

    const { error: uploadError } = await getSupabaseAdmin()
      .storage.from(MEDIA_BUCKET)
      .upload(path, bytes, {
        contentType: mimeType,
        cacheControl: "3600",
        // A UUID key never collides, so an upsert could only ever overwrite
        // somebody else's object.
        upsert: false,
      });

    if (uploadError) {
      if (isBucketMissing(uploadError.message)) {
        console.error(
          `[Widget/upload] bucket "${MEDIA_BUCKET}" missing — run supabase/migrations/024_chat_media.sql`
        );
        return widgetJson({ error: "Attachments are not available right now." }, origin, {
          status: 503,
        });
      }
      console.error("[Widget/upload] storage error:", uploadError.message);
      return widgetJson({ error: "That file didn't upload. Please try again." }, origin, {
        status: 502,
      });
    }

    // Signed so the composer can show a real preview of the stored object
    // rather than trusting the local file handle.
    const url = await signMediaPath(path);

    return widgetJson(
      {
        path,
        kind: check.kind,
        filename,
        mime_type: mimeType,
        size: file.size,
        url,
      },
      origin,
      { status: 201 }
    );
  } catch (error) {
    console.error("[Widget/upload] error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
