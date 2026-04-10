import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";

// TEMPORARY diagnostic endpoint — remove after debugging
// Usage: GET /api/debug/tenant-config?phone_number_id=YOUR_PHONE_NUMBER_ID
export async function GET(request: NextRequest) {
  const phoneNumberId = request.nextUrl.searchParams.get("phone_number_id");

  if (!phoneNumberId) {
    // If no phone_number_id, list all active tenants (names + IDs only)
    const { data: tenants } = await getSupabaseAdmin()
      .from("tenants")
      .select("id, name, whatsapp_phone_number_id, config")
      .eq("is_active", true);

    if (!tenants || tenants.length === 0) {
      return NextResponse.json({ error: "No active tenants found" }, { status: 404 });
    }

    return NextResponse.json({
      tenants: tenants.map((t) => ({
        id: t.id,
        name: t.name,
        phone_number_id: t.whatsapp_phone_number_id,
        quick_replies: (t.config as Record<string, unknown>)?.quick_replies,
        welcome_message: (t.config as Record<string, unknown>)?.welcome_message,
        fallback_message: (t.config as Record<string, unknown>)?.fallback_message,
      })),
    });
  }

  const { data: tenant, error } = await getSupabaseAdmin()
    .from("tenants")
    .select("*")
    .eq("whatsapp_phone_number_id", phoneNumberId)
    .eq("is_active", true)
    .single();

  if (error || !tenant) {
    return NextResponse.json({ error: "Tenant not found", details: error?.message }, { status: 404 });
  }

  const config = tenant.config as Record<string, unknown>;

  // Also check recent conversations for this tenant to see if isNew keeps firing
  const { data: recentConvos } = await getSupabaseAdmin()
    .from("conversations")
    .select("id, status, customer_phone, ai_enabled, metadata, created_at, last_message_at")
    .eq("tenant_id", tenant.id)
    .order("created_at", { ascending: false })
    .limit(10);

  return NextResponse.json({
    tenant_id: tenant.id,
    tenant_name: tenant.name,
    config_summary: {
      welcome_message: config.welcome_message,
      fallback_message: config.fallback_message,
      quick_replies: config.quick_replies,
      flows_count: Array.isArray(config.flows) ? config.flows.length : 0,
      escalation_rules: config.escalation_rules,
      voice_callback_enabled: config.voice_callback_enabled,
    },
    recent_conversations: recentConvos,
  });
}
