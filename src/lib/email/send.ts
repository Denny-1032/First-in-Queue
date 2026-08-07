// =============================================
// Shared transactional email (Resend). §11.4: RESEND_API_KEY is already in use;
// the invite route inlined the call. Extracted here so send-instructions,
// transcripts and stale-install alerts reuse one path.
//
// No-ops (returns { sent: false }) when RESEND_API_KEY is unset so local/dev and
// preview never hard-fail on a missing key. Throws only on an actual API error.
// =============================================

const RESEND_ENDPOINT = "https://api.resend.com/emails";
const DEFAULT_FROM = "First in Queue <noreply@firstinqueue.com>";

export interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  from?: string;
  replyTo?: string;
}

export async function sendEmail(params: SendEmailParams): Promise<{ sent: boolean; id?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("[email] RESEND_API_KEY not set — skipping send");
    return { sent: false };
  }

  const res = await fetch(RESEND_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: params.from || DEFAULT_FROM,
      to: params.to,
      subject: params.subject,
      html: params.html,
      ...(params.replyTo ? { reply_to: params.replyTo } : {}),
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Email send failed: ${err}`);
  }

  const data = (await res.json().catch(() => ({}))) as { id?: string };
  return { sent: true, id: data.id };
}

/** Minimal shared shell so all product emails look consistent. */
export function emailShell(bodyHtml: string): string {
  return `<div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#fff">
  <img src="https://firstinqueue.com/fiq-logo.png" alt="First in Queue" style="height:36px;margin-bottom:24px" />
  ${bodyHtml}
  <p style="color:#999;font-size:12px;margin-top:28px">First in Queue · firstinqueue.com</p>
</div>`;
}
