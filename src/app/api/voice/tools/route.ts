import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { getTenantById } from "@/lib/db/operations";
import { executeBookingTool, type BookingToolContext } from "@/lib/ai/booking-tools";

// =============================================
// Retell AI Custom Function Endpoint
// The voice agent calls this mid-call to check availability and manage
// bookings. Register the functions on the Retell LLM pointing at:
//   {NEXT_PUBLIC_APP_URL}/api/voice/tools?secret={RETELL_FUNCTION_SECRET}
// Retell POSTs { call, name, args } and speaks back whatever we return.
// =============================================

const VALID_TOOLS = new Set([
  "check_availability",
  "create_booking",
  "find_my_bookings",
  "reschedule_booking",
  "cancel_booking",
]);

// Retell web calls have no real caller number; PSTN numbers are E.164 (8+ digits).
function isRealPhone(v: unknown): v is string {
  return typeof v === "string" && v.replace(/\D/g, "").length >= 8;
}

export async function POST(request: NextRequest) {
  try {
    // Auth - custom-function calls carry no Retell signature, so gate on a shared secret.
    const secret = request.nextUrl.searchParams.get("secret");
    const expected = process.env.RETELL_FUNCTION_SECRET;
    if (!expected) {
      console.error("[Voice Tools] RETELL_FUNCTION_SECRET not configured");
      return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
    }
    if (secret !== expected) {
      console.warn("[Voice Tools] Invalid secret - rejecting request");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = (await request.json()) as Record<string, unknown>;
    const call = (payload.call as Record<string, unknown>) || {};
    const name = String(payload.name || "");

    // Retell sends args as an object, but tolerate a JSON string too.
    let args: Record<string, unknown> = {};
    const rawArgs = payload.args;
    if (rawArgs && typeof rawArgs === "object") {
      args = rawArgs as Record<string, unknown>;
    } else if (typeof rawArgs === "string") {
      try {
        args = JSON.parse(rawArgs);
      } catch {
        args = {};
      }
    }

    if (!VALID_TOOLS.has(name)) {
      return NextResponse.json({ result: { error: `Unknown tool: ${name}` } });
    }

    const supabase = getSupabaseAdmin();

    // Resolve tenant: inbound route stamps metadata.tenant_id; otherwise map via agent.
    const metadata = (call.metadata as Record<string, unknown>) || {};
    let tenantId = typeof metadata.tenant_id === "string" ? metadata.tenant_id : "";

    if (!tenantId) {
      const agentId = call.agent_id as string | undefined;
      if (agentId) {
        const { data: voiceAgent } = await supabase
          .from("voice_agents")
          .select("tenant_id")
          .eq("retell_agent_id", agentId)
          .single();
        if (voiceAgent) tenantId = voiceAgent.tenant_id;
      }
    }

    if (!tenantId) {
      console.warn("[Voice Tools] Could not resolve tenant for call", call.call_id);
      return NextResponse.json({ result: { error: "Could not identify the business for this call." } });
    }

    const tenant = await getTenantById(tenantId);
    const settings = tenant?.config?.booking_settings;
    if (!tenant || !settings?.enabled) {
      return NextResponse.json({ result: { error: "Booking is not enabled for this business." } });
    }

    // Customer identity: use the real caller number for phone calls; for web calls
    // (no number) the agent collects a callback number and passes it in args.
    const collectedPhone =
      (args.customer_phone as string) || (args.phone as string) || (args.callback_number as string);
    const customerPhone = isRealPhone(call.from_number)
      ? (call.from_number as string)
      : isRealPhone(collectedPhone)
        ? collectedPhone.replace(/[^\d+]/g, "")
        : "";

    // Booking/reschedule/cancel all need to know who the customer is.
    if (!customerPhone) {
      return NextResponse.json({
        result: {
          error:
            "I need a phone number to attach this booking to. Please ask the caller for a callback number.",
        },
      });
    }

    const ctx: BookingToolContext = {
      tenant_id: tenantId,
      customer_phone: customerPhone,
      customer_name: (args.customer_name as string) || undefined,
      settings,
      operating_hours: tenant.config.operating_hours,
      source: "voice_tool",
      details: { retell_call_id: (call.call_id as string) || null },
    };

    const output = await executeBookingTool(name, args, ctx);
    return NextResponse.json({ result: output.result });
  } catch (error) {
    console.error("[Voice Tools] Error:", error);
    // Return a spoken-friendly error rather than a 500 so the agent can recover.
    return NextResponse.json({ result: { error: "Something went wrong handling that request." } });
  }
}
