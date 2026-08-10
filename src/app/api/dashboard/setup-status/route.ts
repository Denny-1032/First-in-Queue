import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { requireSession, AuthError } from "@/lib/auth/session";

/**
 * GET /api/dashboard/setup-status
 *
 * What is actually switched on for this tenant, for the dashboard's setup
 * checklist. Every item is read from real state - a tenant cannot tick a box by
 * visiting a page, only by having the thing configured.
 *
 * Not polled: setup changes on the scale of days, so the home page fetches this
 * once per load while /api/dashboard/live carries the fast-moving numbers.
 */
export async function GET() {
  try {
    const session = await requireSession();
    const tenantId = session.tenantId;
    const db = getSupabaseAdmin();

    const [{ data: tenant }, { data: properties }, { count: voiceAgents }] = await Promise.all([
      db.from("tenants").select("config, whatsapp_phone_number_id").eq("id", tenantId).maybeSingle(),
      db.from("properties").select("install_status").eq("tenant_id", tenantId).eq("is_active", true),
      db.from("voice_agents").select("*", { count: "exact", head: true })
        .eq("tenant_id", tenantId).eq("is_active", true),
    ]);

    const config = (tenant?.config || {}) as Record<string, unknown>;
    const businessName = typeof config.business_name === "string" ? config.business_name : "";
    const knowledge = Array.isArray(config.knowledge_base) ? config.knowledge_base.length : 0;
    const faqs = Array.isArray(config.faqs) ? config.faqs.length : 0;

    const items = [
      {
        id: "account",
        label: "Create your account",
        done: true,
        href: null as string | null,
      },
      {
        id: "business",
        // The signup default. Until it is changed, the assistant introduces
        // itself as "Your Business".
        label: "Tell us about your business",
        done: !!businessName && businessName !== "Your Business",
        href: "/dashboard/settings",
      },
      {
        id: "knowledge",
        label: "Add what the assistant should know",
        done: knowledge + faqs > 0,
        href: "/dashboard/ai-config",
      },
      {
        id: "widget",
        // 'verified' means we have actually seen the snippet load on their
        // site - not that they copied it.
        label: "Put the chat widget on your website",
        done: (properties || []).some((p: { install_status?: string }) => p.install_status === "verified"),
        href: "/dashboard/properties",
      },
      {
        id: "whatsapp",
        label: "Connect WhatsApp",
        done: !!tenant?.whatsapp_phone_number_id,
        href: "/dashboard/settings",
      },
      {
        id: "voice",
        label: "Set up your voice agent",
        done: (voiceAgents || 0) > 0,
        href: "/dashboard/voice",
      },
    ];

    const done = items.filter((i) => i.done).length;

    return NextResponse.json({
      items,
      done,
      total: items.length,
      percent: Math.round((done / items.length) * 100),
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[Dashboard/setup-status] Error:", error);
    return NextResponse.json({ error: "Failed to load setup status" }, { status: 500 });
  }
}
