import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { makeOutboundCallViaTwilio } from "@/lib/voice/twilio-client";
import { checkVoiceMinutes } from "@/lib/voice/usage";

// =============================================
// Outbound Voice Call API
// POST: Initiate an AI voice call to a customer
// =============================================

export async function POST(request: NextRequest) {
  try {
    // Check if telephony is available
    const voiceProvider = process.env.VOICE_PROVIDER || "twilio";
    if (voiceProvider === "web" || voiceProvider === "none") {
      return NextResponse.json(
        {
          error: "Outbound calls unavailable",
          message: "Voice provider is set to web-only mode. Outbound phone calls require Twilio or Telnyx. Use the web call widget instead.",
        },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { tenantId, customerPhone, customerName, purpose, voiceAgentId } = body;

    if (!tenantId || !customerPhone) {
      return NextResponse.json(
        { error: "tenantId and customerPhone are required" },
        { status: 400 }
      );
    }

    // Validate E.164 phone number format
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
        {
          error: "Voice minute limit reached",
          used: usage.used,
          limit: usage.limit,
        },
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

    const fromNumber = process.env.TWILIO_VOICE_NUMBER;
    if (!fromNumber) {
      return NextResponse.json(
        { error: "Voice calling not configured (missing phone number)" },
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
        },
      })
      .select()
      .single();

    if (insertError) {
      console.error("[Voice Call] Failed to create call record:", insertError);
      return NextResponse.json({ error: "Failed to initiate call" }, { status: 500 });
    }

    // Initiate call via Twilio (connects to Retell agent via SIP)
    // Cap at 5 minutes for dashboard-initiated calls
    try {
      const twilioCall = await makeOutboundCallViaTwilio({
        fromNumber,
        toNumber: customerPhone,
        retellAgentId: voiceAgent.retell_agent_id,
        maxCallDurationSeconds: 300,
        metadata: {
          fiq_call_id: callRecord.id,
          tenant_id: tenantId,
        },
        dynamicVariables: customerName
          ? { customer_name: customerName }
          : undefined,
      });

      // Update record with Retell call ID (for webhook matching) and Twilio SID
      await supabase
        .from("voice_calls")
        .update({
          retell_call_id: twilioCall.retell_call_id,
          metadata: {
            ...callRecord.metadata,
            twilio_call_sid: twilioCall.call_id,
          },
        })
        .eq("id", callRecord.id);

      return NextResponse.json({
        success: true,
        callId: callRecord.id,
        twilioCallSid: twilioCall.call_id,
        retellCallId: twilioCall.retell_call_id,
        status: "registered",
        remainingMinutes: usage.remaining,
      });
    } catch (twilioError) {
      // Mark call as error if Twilio fails
      await supabase
        .from("voice_calls")
        .update({ status: "error" })
        .eq("id", callRecord.id);

      const msg = twilioError instanceof Error ? twilioError.message : String(twilioError);
      console.error("[Voice Call] Twilio API error:", msg);
      return NextResponse.json(
        { error: `Failed to connect call: ${msg}` },
        { status: 502 }
      );
    }
  } catch (error) {
    console.error("[Voice Call] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
