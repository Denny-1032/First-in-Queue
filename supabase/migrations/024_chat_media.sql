-- =============================================
-- 024: Web chat attachments (images + documents)
-- ---------------------------------------------
-- Storage for files a website visitor attaches in the chat widget.
--
-- The bucket is PRIVATE and gets NO storage.objects policies at all. That is
-- deliberate, not an omission:
--
--   * Uploads go through /api/widget/upload, which authorizes the visitor's
--     signed token, validates the mime type, sniffs the bytes, and writes with
--     the service role key. The service role bypasses RLS, so no policy is
--     needed for our own writes.
--   * Reads are short-lived signed URLs minted server-side
--     (src/lib/widget/media-storage.ts).
--
-- A permissive policy here would hand the public anon key read access to every
-- customer's uploaded documents — the same shape of mistake migration 016 had
-- to undo. Do NOT add `USING (true)` policies to this bucket.
--
-- Safe to re-run.
-- =============================================

BEGIN;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chat-media',
  'chat-media',
  FALSE,
  -- Matches MAX_UPLOAD_BYTES in src/lib/widget/media.ts (4 MB). Storage
  -- enforces it again server-side, after our own check.
  4194304,
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/heic',
    'image/heif',
    'application/pdf',
    'text/plain',
    'text/csv',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/zip'
  ]
)
ON CONFLICT (id) DO UPDATE
  SET public = EXCLUDED.public,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

COMMIT;

-- Object keys are `<tenant_id>/<conversation_id>/<uuid>.<ext>`, so a tenant's
-- media can be dropped with a single prefix delete, and a path supplied in a
-- send request is checked against the token's own prefix before it is trusted
-- (isPathInConversation in src/lib/widget/media.ts).
