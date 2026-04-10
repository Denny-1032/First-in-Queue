import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { makeOutboundCallViaTelnyx } from "@/lib/voice/telnyx-client";
import { checkVoiceMinutes } from "@/lib/voice/usage";

/**
 * Telnyx Outbound Voice Call API
 * POST: Initiate an AI voice call to a customer via Telnyx + Retell
 *
 * This is the Telnyx equivalent of /api/voice/call (Twilio version).
 * Use when VOICE_PROVIDER=telnyx.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tenantId, customerPhone, customerName, purpose, voiceAgentId } = body;

    if (!tenantId || !customerPhone) {
      return NextResponse.json(
        { error: "tenantId and customerPhone are required" },
        { status: 400 }
      );
    }

    const phoneRegex = /^\+[1-9]\d{6,14}$/;
    const normalizedPhone = customerPhone.replace(/[\s\-()]/g, "");
    if (!phoneRegex.test(normalizedPhone)) {
      return NextResponse.json(
        { error: "Invalid phone number. Use E.164 format (e.g. +260971234567)" },
        { status: 400 }
      );
    }

    // Check voice minute allowance
    const usage = await checkVoiceMinutes(tenantId);
    if (!usage.allowed) {
      return NextResponse.json(
        { error: "Voice minute limit reached", used: usage.used, limit: usage.limit },
        { status: 403 }
      );
    }

    const supabase = getSupabaseAdmin();

    // Get the voice agent
    let agentQuery = supabase
      .from("voice_agents")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("is_active", true);

    if (voiceAgentId) {
      agentQuery = agentQuery.eq("id", voiceAgentId);
    }

    const { data: voiceAgent } = await agentQuery.limit(1).single();
    if (!voiceAgent) {
      return NextResponse.json(
        { error: "No active voice agent configured. Please set up a voice agent first." },
        { status: 404 }
      );
    }

    const fromNumber = process.env.TELNYX_VOICE_NUMBER;
    if (!fromNumber) {
      return NextResponse.json(
        { error: "Voice calling not configured (TELNYX_VOICE_NUMBER missing)" },
        { status: 500 }
      );
    }

    // Create call record in DB first
    const { data: callRecord, error: insertError } = await supabase
      .from("voice_calls")
      .insert({
        tenant_id: tenantId,
        voice_agent_id: voiceAgent.id,
        direction: "outbound",
        caller_phone: fromNumber,
        callee_phone: customerPhone,
        status: "registered",
        metadata: {
          customer_name: customerName || null,
          purpose: purpose || null,
          telephony_provider: "telnyx",
        },
      })
      .select()
      .single();

    if (insertError) {
      console.error("[Telnyx Call] Failed to create call record:", insertError);
      return NextResponse.json({ error: "Failed to initiate call" }, { status: 500 });
    }

    // Initiate call via Telnyx → bridges to Retell on call.answered webhook
    // Cap at 5 minutes for dashboard-initiated calls
    try {
      const telnyxCall = await makeOutboundCallViaTelnyx({
        fromNumber,
        toNumber: customerPhone,
        retellAgentId: voiceAgent.retell_agent_id,
        maxCallDurationSeconds: 300,
        metadata: {
          fiq_call_id: callRecord.id,
          tenant_id: tenantId,
        },
        dynamicVariables: customerName ? { customer_name: customerName } : undefined,
      });

      // Update record with call IDs for webhook matching
      await supabase
        .from("voice_calls")
        .update({
          retell_call_id: telnyxCall.retell_call_id,
          metadata: {
            ...callRecord.metadata,
            telnyx_call_id: telnyxCall.call_id,
            telnyx_call_control_id: telnyxCall.call_control_id,
          },
        })
        .eq("id", callRecord.id);

      return NextResponse.json({
        success: true,
        callId: callRecord.id,
        telnyxCallId: telnyxCall.call_id,
        retellCallId: telnyxCall.retell_call_id,
        status: "registered",
        remainingMinutes: usage.remaining,
      });
    } catch (telnyxError) {
      await supabase
        .from("voice_calls")
        .update({ status: "error" })
        .eq("id", callRecord.id);

      const msg = telnyxError instanceof Error ? telnyxError.message : String(telnyxError);
      console.error("[Telnyx Call] API error:", msg);
      return NextResponse.json({ error: `Failed to connect call: ${msg}` }, { status: 502 });
    }
  } catch (error) {
    console.error("[Telnyx Call] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
