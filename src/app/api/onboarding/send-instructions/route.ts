import { NextRequest, NextResponse } from "next/server";
import { requireSession, AuthError } from "@/lib/auth/session";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { sendEmail, emailShell } from "@/lib/email/send";
import { buildEmbedSnippet } from "@/lib/properties/input";
import { trackEvent } from "@/lib/analytics/track";

// =============================================
// "Send instructions to my developer" (§5 escape hatch). Emails the install
// snippet + guide to a chosen address. For ZRA-type buyers this is the only
// install path — the evaluator never has access to publish HTML themselves.
//
// Authed + session-scoped: the property is looked up by id AND tenant_id, so a
// signed-in user can only send instructions for their OWN property.
// =============================================

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function baseUrl(request: NextRequest): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    request.nextUrl.origin
  ).replace(/\/+$/, "");
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    const body = (await request.json().catch(() => null)) as {
      to_email?: string;
      property_id?: string;
    } | null;

    const toEmail = body?.to_email?.trim().toLowerCase();
    if (!toEmail || !EMAIL_RE.test(toEmail)) {
      return NextResponse.json({ error: "A valid email address is required" }, { status: 400 });
    }
    if (!body?.property_id) {
      return NextResponse.json({ error: "property_id is required" }, { status: 400 });
    }

    const { data: property } = await getSupabaseAdmin()
      .from("properties")
      .select("id, name, widget_key")
      .eq("id", body.property_id)
      .eq("tenant_id", session.tenantId)
      .maybeSingle();

    if (!property) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }

    const snippet = buildEmbedSnippet(baseUrl(request), property.widget_key as string);
    const html = emailShell(`
      <h2 style="color:#111;font-size:20px;margin:0 0 8px">Install the ${property.name} chat widget</h2>
      <p style="color:#555;font-size:14px;line-height:1.6;margin:0 0 16px">
        Paste this one line just before the closing <code>&lt;/body&gt;</code> tag on every page of the site:
      </p>
      <pre style="background:#0f172a;color:#e2e8f0;padding:14px 16px;border-radius:8px;font-size:13px;overflow-x:auto;white-space:pre-wrap;word-break:break-all">${snippet
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")}</pre>
      <p style="color:#555;font-size:14px;line-height:1.6;margin:16px 0 0">
        That's it — the chat bubble appears automatically. On WordPress, use the First in Queue
        plugin and paste the key: <strong>${property.widget_key}</strong>.
      </p>
    `);

    const result = await sendEmail({
      to: toEmail,
      subject: `Install instructions for your ${property.name} chat widget`,
      html,
      replyTo: session.email,
    });

    if (!result.sent) {
      return NextResponse.json(
        { error: "Email is not configured on this server" },
        { status: 503 }
      );
    }

    await trackEvent(session.tenantId, "instructions_emailed", {
      property_id: property.id,
    });

    return NextResponse.json({ sent: true });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[API/onboarding/send-instructions] error:", error);
    return NextResponse.json({ error: "Failed to send instructions" }, { status: 500 });
  }
}
