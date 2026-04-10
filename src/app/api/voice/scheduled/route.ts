import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { makeOutboundCallViaTwilio } from "@/lib/voice/twilio-client";
import { checkVoiceMinutes } from "@/lib/voice/usage";

// =============================================
// Scheduled Voice Calls API
// GET:  List scheduled calls for a tenant
// POST: Create a new scheduled call
// =============================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get("tenantId");
    const status = searchParams.get("status");

    if (!tenantId) {
      return NextResponse.json({ error: "tenantId is required" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    let query = supabase
      .from("scheduled_calls")
      .select("*, voice_agents(name)")
      .eq("tenant_id", tenantId)
      .order("scheduled_at", { ascending: true });

    if (status) {
      query = query.eq("status", status);
    }

    const { data, error } = await query.limit(100);

    if (error) {
      console.error("[Scheduled Calls] Fetch error:", error);
      return NextResponse.json({ error: "Failed to fetch scheduled calls" }, { status: 500 });
    }

    return NextResponse.json({ scheduledCalls: data || [] });
  } catch (error) {
    console.error("[Scheduled Calls] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      tenantId,
      voiceAgentId,
      customerPhone,
      customerName,
      purpose,
      scheduledAt,
      maxRetries,
    } = body;

    if (!tenantId || !customerPhone || !scheduledAt) {
      return NextResponse.json(
        { error: "tenantId, customerPhone, and scheduledAt are required" },
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

    const supabase = getSupabaseAdmin();

    // Validate voice agent exists
    let agentQuery = supabase
      .from("voice_agents")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("is_active", true);

    if (voiceAgentId) {
      agentQuery = agentQuery.eq("id", voiceAgentId);
    }

    const { data: agent } = await agentQuery.limit(1).single();

    if (!agent) {
      return NextResponse.json(
        { error: "No active voice agent found. Please set up a voice agent first." },
        { status: 404 }
      );
    }

    const { data: scheduled, error } = await supabase
      .from("scheduled_calls")
      .insert({
        tenant_id: tenantId,
        voice_agent_id: agent.id,
        customer_phone: customerPhone,
        customer_name: customerName || null,
        purpose: purpose || null,
        scheduled_at: scheduledAt,
        max_retries: maxRetries || 2,
        status: "pending",
      })
      .select()
      .single();

    if (error) {
      console.error("[Scheduled Calls] Insert error:", error);
      return NextResponse.json({ error: "Failed to create scheduled call" }, { status: 500 });
    }

    return NextResponse.json({ success: true, scheduledCall: scheduled }, { status: 201 });
  } catch (error) {
    console.error("[Scheduled Calls] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// =============================================
// PATCH: Trigger due scheduled calls (called by cron)
// Requires x-cron-secret header matching APP_SECRET
// =============================================
export async function PATCH(request: NextRequest) {
  try {
    const cronSecret = request.headers.get("x-cron-secret");
    const appSecret = process.env.APP_SECRET;
    if (!appSecret || cronSecret !== appSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const supabase = getSupabaseAdmin();
    const now = new Date().toISOString();

    // Find all pending calls that are due
    const { data: dueCalls } = await supabase
      .from("scheduled_calls")
      .select("*, voice_agents(retell_agent_id, tenant_id)")
      .eq("status", "pending")
      .lte("scheduled_at", now)
      .order("scheduled_at", { ascending: true })
      .limit(20);

    if (!dueCalls || dueCalls.length === 0) {
      return NextResponse.json({ triggered: 0 });
    }

    let triggered = 0;
    let failed = 0;

    for (const call of dueCalls) {
      try {
        const voiceAgent = call.voice_agents as { retell_agent_id: string; tenant_id: string } | null;
        if (!voiceAgent) continue;

        // Check voice minutes
        const usage = await checkVoiceMinutes(call.tenant_id);
        if (!usage.allowed) {
          await supabase
            .from("scheduled_calls")
            .update({
              status: "failed",
              error_message: "Voice minute limit reached",
              updated_at: new Date().toISOString(),
            })
            .eq("id", call.id);
          failed++;
          continue;
        }

        // Mark as calling
        await supabase
          .from("scheduled_calls")
          .update({ status: "calling", updated_at: new Date().toISOString() })
          .eq("id", call.id);

        const voiceProvider = process.env.VOICE_PROVIDER || "twilio";
        const isTelnyx = voiceProvider === "telnyx";

        const fromNumber = isTelnyx
          ? process.env.TELNYX_VOICE_NUMBER
          : process.env.TWILIO_VOICE_NUMBER;

        if (!fromNumber) {
          throw new Error(
            isTelnyx ? "TELNYX_VOICE_NUMBER not configured" : "TWILIO_VOICE_NUMBER not configured"
          );
        }

        // Create voice call record
        const { data: callRecord } = await supabase
          .from("voice_calls")
          .insert({
            tenant_id: call.tenant_id,
            voice_agent_id: call.voice_agent_id,
            direction: "outbound",
            caller_phone: fromNumber,
            callee_phone: call.customer_phone,
            status: "registered",
            metadata: {
              scheduled_call_id: call.id,
              customer_name: call.customer_name,
              purpose: call.purpose,
              telephony_provider: voiceProvider,
            },
          })
          .select()
          .single();

        let finalRetellCallId: string;
        let providerCallId: string;

        if (isTelnyx) {
          const { makeOutboundCallViaTelnyx } = await import("@/lib/voice/telnyx-client");
          const telnyxCall = await makeOutboundCallViaTelnyx({
            fromNumber,
            toNumber: call.customer_phone,
            retellAgentId: voiceAgent.retell_agent_id,
            metadata: {
              scheduled_call_id: call.id,
              fiq_call_id: callRecord?.id || "",
              tenant_id: call.tenant_id,
            },
            dynamicVariables: call.customer_name
              ? { customer_name: call.customer_name }
              : undefined,
          });
          finalRetellCallId = telnyxCall.retell_call_id;
          providerCallId = telnyxCall.call_id;

          if (callRecord) {
            await supabase
              .from("voice_calls")
              .update({
                retell_call_id: telnyxCall.retell_call_id,
                metadata: {
                  ...callRecord.metadata,
                  telnyx_call_id: telnyxCall.call_id,
                },
              })
              .eq("id", callRecord.id);
          }
        } else {
          const twilioCall = await makeOutboundCallViaTwilio({
            fromNumber,
            toNumber: call.customer_phone,
            retellAgentId: voiceAgent.retell_agent_id,
            metadata: {
              scheduled_call_id: call.id,
              fiq_call_id: callRecord?.id || "",
              tenant_id: call.tenant_id,
            },
            dynamicVariables: call.customer_name
              ? { customer_name: call.customer_name }
              : undefined,
          });
          finalRetellCallId = twilioCall.retell_call_id;
          providerCallId = twilioCall.call_id;

          if (callRecord) {
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
          }
        }

        console.log(`[Scheduled Calls] ${voiceProvider} call initiated: id=${providerCallId} retellCallId=${finalRetellCallId}`);
        void providerCallId;

        await supabase
          .from("scheduled_calls")
          .update({
            retell_call_id: finalRetellCallId,
            updated_at: new Date().toISOString(),
          })
          .eq("id", call.id);

        triggered++;
      } catch (err) {
        console.error(`[Scheduled Calls] Failed to trigger call ${call.id}:`, err);

        // Retry logic
        const newRetryCount = (call.retry_count || 0) + 1;
        const maxRetries = call.max_retries || 2;

        await supabase
          .from("scheduled_calls")
          .update({
            status: newRetryCount >= maxRetries ? "failed" : "pending",
            retry_count: newRetryCount,
            error_message: err instanceof Error ? err.message : "Unknown error",
            // If retrying, schedule 5 minutes later
            ...(newRetryCount < maxRetries
              ? { scheduled_at: new Date(Date.now() + 5 * 60 * 1000).toISOString() }
              : {}),
            updated_at: new Date().toISOString(),
          })
          .eq("id", call.id);

        failed++;
      }
    }

    console.log(`[Scheduled Calls] Triggered: ${triggered}, Failed: ${failed}`);
    return NextResponse.json({ triggered, failed });
  } catch (error) {
    console.error("[Scheduled Calls] Trigger error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
