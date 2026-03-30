import { NextRequest, NextResponse } from "next/server";
import Retell from "retell-sdk";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { recordVoiceUsage } from "@/lib/voice/usage";

// =============================================
// Retell AI Webhook Endpoint
// Receives call lifecycle events from Retell.
// Register this URL in your Retell dashboard.
// =============================================

export async function POST(request: NextRequest) {
  try {
    // Verify webhook signature from Retell
    const rawBody = await request.text();
    const signature = request.headers.get("x-retell-signature") || "";
    const apiKey = process.env.RETELL_API_KEY;

    if (!apiKey) {
      console.error("[Voice Webhook] RETELL_API_KEY not configured");
      return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
    }

    if (!Retell.verify(rawBody, apiKey, signature)) {
      console.warn("[Voice Webhook] Invalid signature — rejecting request");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const payload = JSON.parse(rawBody);
    const event = payload.event;

    console.log(`[Voice Webhook] Event: ${event}`);

    switch (event) {
      case "call_started":
        await handleCallStarted(payload);
        break;
      case "call_ended":
        await handleCallEnded(payload);
        break;
      case "call_analyzed":
        await handleCallAnalyzed(payload);
        break;
      default:
        console.log(`[Voice Webhook] Unhandled event: ${event}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[Voice Webhook] Error:", error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}

async function handleCallStarted(payload: Record<string, unknown>) {
  const call = payload.call as Record<string, unknown>;
  if (!call) return;

  const supabase = getSupabaseAdmin();
  const retellCallId = call.call_id as string;
  const direction = call.direction as string || "inbound";

  // Find the voice call record (created when outbound initiated, or create for inbound)
  const { data: existing } = await supabase
    .from("voice_calls")
    .select("id")
    .eq("retell_call_id", retellCallId)
    .single();

  if (existing) {
    // Update existing record (outbound call)
    await supabase
      .from("voice_calls")
      .update({
        status: "ongoing",
        started_at: new Date().toISOString(),
      })
      .eq("retell_call_id", retellCallId);
  } else {
    // Inbound call — need to find tenant from agent
    const agentId = call.agent_id as string;
    const { data: voiceAgent } = await supabase
      .from("voice_agents")
      .select("id, tenant_id")
      .eq("retell_agent_id", agentId)
      .single();

    if (!voiceAgent) {
      console.warn(`[Voice Webhook] No voice agent found for retell agent: ${agentId}`);
      return;
    }

    await supabase.from("voice_calls").insert({
      tenant_id: voiceAgent.tenant_id,
      voice_agent_id: voiceAgent.id,
      retell_call_id: retellCallId,
      direction,
      caller_phone: (call.from_number as string) || null,
      callee_phone: (call.to_number as string) || null,
      status: "ongoing",
      started_at: new Date().toISOString(),
      metadata: (call.metadata as Record<string, unknown>) || {},
    });
  }

  console.log(`[Voice Webhook] Call started: ${retellCallId}`);
}

async function handleCallEnded(payload: Record<string, unknown>) {
  const call = payload.call as Record<string, unknown>;
  if (!call) return;

  const supabase = getSupabaseAdmin();
  const retellCallId = call.call_id as string;
  const durationMs = (call.duration_ms as number) || 0;
  const durationSeconds = Math.round(durationMs / 1000);

  // Update call record
  const { data: voiceCall } = await supabase
    .from("voice_calls")
    .update({
      status: "ended",
      duration_seconds: durationSeconds,
      transcript: (call.transcript as string) || null,
      transcript_object: (call.transcript_object as unknown) || null,
      recording_url: (call.recording_url as string) || null,
      disconnection_reason: (call.disconnection_reason as string) || null,
      ended_at: new Date().toISOString(),
    })
    .eq("retell_call_id", retellCallId)
    .select("tenant_id")
    .single();

  // Record voice usage
  if (voiceCall && durationSeconds > 0) {
    await recordVoiceUsage(voiceCall.tenant_id, durationSeconds);
  }

  console.log(`[Voice Webhook] Call ended: ${retellCallId} (${durationSeconds}s)`);
}

async function handleCallAnalyzed(payload: Record<string, unknown>) {
  const call = payload.call as Record<string, unknown>;
  if (!call) return;

  const supabase = getSupabaseAdmin();
  const retellCallId = call.call_id as string;
  const callAnalysis = call.call_analysis as Record<string, unknown>;

  if (callAnalysis) {
    await supabase
      .from("voice_calls")
      .update({
        call_analysis: callAnalysis,
        latency_ms: (call.latency as Record<string, unknown>) || null,
      })
      .eq("retell_call_id", retellCallId);
  }

  console.log(`[Voice Webhook] Call analyzed: ${retellCallId}`);
}
