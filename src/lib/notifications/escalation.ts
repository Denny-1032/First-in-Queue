import { getSupabaseAdmin } from "@/lib/supabase/server";
import { sendEmail, emailShell } from "@/lib/email/send";

// =============================================
// Tell a human that a conversation needs one.
// ---------------------------------------------
// handleEscalation() either assigns an online agent, or - when nobody is marked
// online - parks the conversation as `waiting` and tells the customer "our team
// will reach out to you very soon". Neither branch used to notify anyone, so
// that promise was kept only if somebody happened to be watching the dashboard.
//
// Deliberately notifies regardless of `is_online`: the offline case is the one
// where NO agent was assigned, which makes it the case that most needs an email.
// =============================================

export interface EscalationNotice {
  tenantId: string;
  tenantName: string;
  conversationId: string;
  /** Why the AI escalated - shown verbatim so the reader can triage before opening it. */
  reason?: string;
  /** What the customer last said. */
  customerMessage?: string;
  /** Present when an online agent was assigned; absent when the conversation is waiting. */
  assignedAgentName?: string;
}

/** Everyone who should know: the tenant's agents plus the account owners. */
async function recipientsFor(tenantId: string): Promise<string[]> {
  const db = getSupabaseAdmin();
  const emails = new Set<string>();

  const { data: agents } = await db.from("agents").select("email").eq("tenant_id", tenantId);
  for (const a of agents || []) {
    if (a.email) emails.add(String(a.email).toLowerCase());
  }

  // Owners are users linked through user_tenants (with the legacy users.tenant_id
  // fallback the login route also honours - see src/app/api/auth/login/route.ts).
  const { data: links } = await db
    .from("user_tenants")
    .select("user_id")
    .eq("tenant_id", tenantId);
  const userIds = (links || []).map((l) => l.user_id as string).filter(Boolean);
  if (userIds.length > 0) {
    const { data: users } = await db.from("users").select("email").in("id", userIds);
    for (const u of users || []) {
      if (u.email) emails.add(String(u.email).toLowerCase());
    }
  }

  const { data: legacy } = await db.from("users").select("email").eq("tenant_id", tenantId);
  for (const u of legacy || []) {
    if (u.email) emails.add(String(u.email).toLowerCase());
  }

  return [...emails];
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Email the tenant's team that a conversation has been handed over.
 *
 * Resolves rather than rejects on failure. The caller is midway through replying
 * to a customer; a mail problem must never cost them that reply.
 */
export async function notifyEscalation(notice: EscalationNotice): Promise<{ notified: number }> {
  try {
    const to = await recipientsFor(notice.tenantId);
    if (to.length === 0) {
      console.warn(`[escalation] No agents or owners to notify for tenant ${notice.tenantId}`);
      return { notified: 0 };
    }

    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://firstinqueue.com").replace(/\/$/, "");
    const link = `${appUrl}/dashboard/conversations?id=${encodeURIComponent(notice.conversationId)}`;

    const waiting = !notice.assignedAgentName;
    const subject = waiting
      ? `Waiting for a reply - ${notice.tenantName}`
      : `Handed to ${notice.assignedAgentName} - ${notice.tenantName}`;

    const lead = waiting
      ? "A customer has been told someone will reach out. Nobody was online, so this conversation is unassigned."
      : `This conversation was assigned to ${escapeHtml(notice.assignedAgentName!)}.`;

    const html = emailShell(`
      <h2 style="font-size:18px;margin:0 0 12px">${waiting ? "A conversation is waiting" : "A conversation was handed over"}</h2>
      <p style="margin:0 0 16px;color:#333">${lead}</p>
      ${notice.reason ? `<p style="margin:0 0 8px;color:#333"><strong>Reason:</strong> ${escapeHtml(notice.reason)}</p>` : ""}
      ${notice.customerMessage ? `<p style="margin:0 0 16px;color:#333"><strong>Customer said:</strong> "${escapeHtml(notice.customerMessage.slice(0, 400))}"</p>` : ""}
      <p style="margin:0 0 8px"><a href="${link}" style="color:#03A84E">Open the conversation</a></p>
    `);

    await Promise.all(
      to.map((address) =>
        sendEmail({ to: address, subject, html }).catch((e) =>
          console.error(`[escalation] send to ${address} failed:`, e)
        )
      )
    );

    console.log(`[escalation] Notified ${to.length} recipient(s) for conversation ${notice.conversationId}`);
    return { notified: to.length };
  } catch (error) {
    console.error("[escalation] Notification failed (non-fatal):", error);
    return { notified: 0 };
  }
}
