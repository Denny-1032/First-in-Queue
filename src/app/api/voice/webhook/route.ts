import { NextRequest, NextResponse } from "next/server";
import Retell from "retell-sdk";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { recordVoiceUsage } from "@/lib/voice/usage";
import { createWhatsAppClient } from "@/lib/whatsapp/client";
import { getTenantById, getAvailableAgent } from "@/lib/db/operations";

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

function needsFollowUp(call: Record<string, unknown>): { needed: boolean; reason: string } {
  const transcript = (call.transcript as string || "").toLowerCase();
  const disconnection = (call.disconnection_reason as string || "").toLowerCase();

  const escalationPhrases = [
    "speak to a human", "speak to someone", "talk to a person", "real person",
    "transfer", "agent please", "human agent", "customer service",
    "can\'t help", "cannot help", "don\'t understand", "not what i",
    "please hold", "team member",
  ];
  const hitEscalation = escalationPhrases.some((p) => transcript.includes(p));

  const callerPhone = (call.from_number as string || "");
  const durationMs = (call.duration_ms as number) || 0;
  const isVeryShort = durationMs < 30000 && callerPhone; // < 30s with a real caller

  if (hitEscalation) return { needed: true, reason: "Caller requested human assistance during call" };
  if (disconnection === "voicemail") return { needed: true, reason: "Call went to voicemail — missed caller" };
  if (isVeryShort) return { needed: true, reason: "Short call — may not have been resolved" };
  return { needed: false, reason: "" };
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
    .select("tenant_id, voice_agent_id, caller_phone")
    .single();

  // Record voice usage
  if (voiceCall && durationSeconds > 0) {
    await recordVoiceUsage(voiceCall.tenant_id, durationSeconds);
  }

  // ── Voice → WhatsApp handoff ─────────────────────────────────────
  // If the call needed human follow-up, open a WhatsApp conversation
  const followUp = needsFollowUp(call);
  const callerPhone = (call.from_number as string) || voiceCall?.caller_phone || "";

  if (followUp.needed && voiceCall?.tenant_id && callerPhone) {
    try {
      const tenant = await getTenantById(voiceCall.tenant_id);
      if (tenant?.whatsapp_access_token && tenant?.whatsapp_phone_number_id) {
        const whatsapp = createWhatsAppClient(tenant.whatsapp_access_token, tenant.whatsapp_phone_number_id);

        // Find or create a WhatsApp conversation for this phone number
        const { data: existingConvo } = await supabase
          .from("conversations")
          .select("id, status")
          .eq("tenant_id", voiceCall.tenant_id)
          .eq("customer_phone", callerPhone)
          .neq("status", "archived")
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        let convoId: string;

        if (existingConvo && existingConvo.status !== "resolved") {
          convoId = existingConvo.id;
          // Escalate the existing conversation
          const agent = await getAvailableAgent(voiceCall.tenant_id);
          await supabase.from("conversations").update({
            status: agent ? "handoff" : "waiting",
            assigned_agent_id: agent?.id || null,
            ai_enabled: false,
            metadata: {
              escalation_reason: `Voice call follow-up: ${followUp.reason}`,
              escalated_at: new Date().toISOString(),
              voice_call_id: retellCallId,
            },
            updated_at: new Date().toISOString(),
          }).eq("id", convoId);
          if (agent) {
            await supabase.from("agents").update({ active_chats: (agent.active_chats || 0) + 1 }).eq("id", agent.id);
          }
        } else {
          // Create a fresh conversation
          const agent = await getAvailableAgent(voiceCall.tenant_id);
          const { data: newConvo } = await supabase
            .from("conversations")
            .insert({
              tenant_id: voiceCall.tenant_id,
              customer_phone: callerPhone,
              customer_name: callerPhone,
              status: agent ? "handoff" : "waiting",
              assigned_agent_id: agent?.id || null,
              ai_enabled: false,
              metadata: {
                escalation_reason: `Voice call follow-up: ${followUp.reason}`,
                escalated_at: new Date().toISOString(),
                voice_call_id: retellCallId,
                source: "voice_handoff",
              },
            })
            .select("id")
            .single();
          convoId = newConvo?.id || "";
          if (agent) {
            await supabase.from("agents").update({ active_chats: (agent.active_chats || 0) + 1 }).eq("id", agent.id);
          }
        }

        if (convoId) {
          // Send WhatsApp follow-up message to the caller
          const followUpMsg = `Hi! Thanks for calling us. It looks like you may need further assistance. One of our team members will be with you shortly on WhatsApp. How can we help?`;
          const waId = await whatsapp.sendText(callerPhone, followUpMsg);
          await supabase.from("messages").insert({
            conversation_id: convoId,
            tenant_id: voiceCall.tenant_id,
            direction: "outbound",
            sender_type: "bot",
            message_type: "text",
            content: { text: followUpMsg, _voice_followup: true },
            whatsapp_message_id: waId,
            status: "sent",
            created_at: new Date().toISOString(),
          });
          console.log(`[Voice Webhook] WhatsApp follow-up sent to ${callerPhone} for call ${retellCallId}`);
        }
      }
    } catch (err) {
      console.error("[Voice Webhook] WhatsApp handoff failed:", err);
    }
  }

  console.log(`[Voice Webhook] Call ended: ${retellCallId} (${durationSeconds}s) followUp=${followUp.needed}`);
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
