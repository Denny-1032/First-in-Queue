import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { requireSession, AuthError } from "@/lib/auth/session";
import { sendEmail, emailShell } from "@/lib/email/send";
import crypto from "crypto";

async function sendInviteEmail(params: {
  toEmail: string;
  toName: string;
  businessName: string;
  inviterName: string;
  inviteUrl: string;
}): Promise<void> {
  const html = emailShell(`
    <h2 style="color:#111;font-size:20px;margin:0 0 8px">You've been invited to join ${params.businessName}</h2>
    <p style="color:#555;font-size:14px;line-height:1.6;margin:0 0 24px">
      ${params.inviterName} has added you as an agent on <strong>First in Queue</strong>.
      Click below to set up your password and start handling conversations.
    </p>
    <a href="${params.inviteUrl}" style="display:inline-block;background:#059669;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:600">
      Accept Invitation
    </a>
    <p style="color:#999;font-size:12px;margin-top:24px">
      This link expires in 72 hours. If you didn't expect this, you can ignore it.
    </p>
  `);

  await sendEmail({
    to: params.toEmail,
    subject: `${params.inviterName} invited you to join ${params.businessName} on First in Queue`,
    html,
  });
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    const body = await request.json();
    const { agentId } = body;

    if (!agentId) {
      return NextResponse.json({ error: "agentId is required" }, { status: 400 });
    }

    const db = getSupabaseAdmin();

    // Fetch agent + tenant
    const { data: agent } = await db
      .from("agents")
      .select("id, name, email, tenant_id")
      .eq("id", agentId)
      .eq("tenant_id", session.tenantId)
      .single();

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    if (!agent.email) {
      return NextResponse.json({ error: "Agent has no email address" }, { status: 400 });
    }

    // Get tenant / inviter details
    const { data: tenant } = await db
      .from("tenants")
      .select("name, config")
      .eq("id", session.tenantId)
      .single();

    const { data: inviterUser } = await db
      .from("users")
      .select("name")
      .eq("id", session.userId)
      .single();

    // Generate invite token (48 random bytes → URL-safe base64)
    const token = crypto.randomBytes(48).toString("base64url");
    const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString();

    await db
      .from("agents")
      .update({
        invite_token: token,
        invite_sent_at: new Date().toISOString(),
        invite_accepted_at: null,
      })
      .eq("id", agentId);

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://firstinqueue.com";
    const inviteUrl = `${appUrl}/invite/accept?token=${token}`;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const businessName = (tenant?.config as any)?.business_name || tenant?.name || "your business";
    const inviterName = inviterUser?.name || session.email;

    try {
      await sendInviteEmail({
        toEmail: agent.email,
        toName: agent.name,
        businessName,
        inviterName,
        inviteUrl,
      });
    } catch (emailErr) {
      console.error("[Team Invite] Email failed:", emailErr);
      // Don't fail - token is stored, link can be shared manually
      return NextResponse.json({
        success: true,
        warning: "Agent added but invite email could not be sent. Share this link manually.",
        inviteUrl,
        expiresAt,
      });
    }

    return NextResponse.json({ success: true, expiresAt });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("[Team Invite] Error:", error);
    return NextResponse.json({ error: "Failed to send invite" }, { status: 500 });
  }
}
