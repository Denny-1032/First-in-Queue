import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";

/**
 * Twilio Call Status Callback
 * Receives status updates for outbound calls initiated via Twilio.
 * Also handles Async AMD (Answering Machine Detection) callbacks.
 *
 * Note: voice_calls.retell_call_id stores the Retell call ID.
 * The Twilio SID is stored in voice_calls.metadata->>'twilio_call_sid'.
 * We look up by metadata JSONB field.
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const callSid = formData.get("CallSid") as string;
    const callStatus = formData.get("CallStatus") as string;
    const duration = formData.get("CallDuration") as string;
    const answeredBy = formData.get("AnsweredBy") as string | null;

    if (!callSid) {
      return NextResponse.json({ error: "Missing CallSid" }, { status: 400 });
    }

    console.log(`[Twilio Status] ${callSid}: status=${callStatus} duration=${duration || "n/a"}s answeredBy=${answeredBy || "n/a"}`);

    // Handle Answering Machine Detection (AMD) callback
    // If voicemail/machine detected, hang up the call immediately to prevent charges
    if (answeredBy && answeredBy !== "human") {
      console.log(`[Twilio Status] Machine detected (${answeredBy}) — hanging up call ${callSid}`);
      try {
        const twilio = (await import("twilio")).default;
        const client = twilio(process.env.TWILIO_ACCOUNT_SID!, process.env.TWILIO_AUTH_TOKEN!);
        await client.calls(callSid).update({ status: "completed" });
        console.log(`[Twilio Status] Call ${callSid} terminated (machine detected)`);
      } catch (hangupErr) {
        console.error(`[Twilio Status] Failed to hang up machine call ${callSid}:`, hangupErr);
      }
    }

    const supabase = getSupabaseAdmin();

    // Map Twilio statuses to our internal statuses
    const statusMap: Record<string, string> = {
      initiated: "registered",
      ringing: "registered",
      "in-progress": "ongoing",
      answered: "ongoing",
      completed: "ended",
      busy: "error",
      "no-answer": "error",
      canceled: "error",
      failed: "error",
    };

    const mappedStatus = statusMap[callStatus] || callStatus;

    // Update the voice call record (match by Twilio SID in metadata)
    const updateData: Record<string, unknown> = {
      status: mappedStatus,
      updated_at: new Date().toISOString(),
    };

    if (callStatus === "completed" && duration) {
      updateData.ended_at = new Date().toISOString();
      updateData.duration_seconds = parseInt(duration, 10);
    }

    if (["busy", "no-answer", "canceled", "failed"].includes(callStatus)) {
      updateData.ended_at = new Date().toISOString();
    }

    // Find the voice call by Twilio SID stored in metadata
    const { data: voiceCall } = await supabase
      .from("voice_calls")
      .select("id, tenant_id, retell_call_id, metadata")
      .filter("metadata->>twilio_call_sid", "eq", callSid)
      .limit(1)
      .maybeSingle();

    if (voiceCall) {
      await supabase
        .from("voice_calls")
        .update(updateData)
        .eq("id", voiceCall.id);

      // Note: Voice usage is recorded by the Retell webhook (voice/webhook/route.ts)
      // to avoid double-counting since both webhooks fire for the same call.

      // Also update scheduled_calls if applicable (match by retell_call_id)
      if (
        voiceCall.retell_call_id &&
        ["completed", "busy", "no-answer", "canceled", "failed"].includes(callStatus)
      ) {
        const finalStatus = callStatus === "completed" ? "completed" : "failed";
        await supabase
          .from("scheduled_calls")
          .update({
            status: finalStatus,
            updated_at: new Date().toISOString(),
            ...(callStatus !== "completed"
              ? { error_message: `Call ${callStatus}` }
              : {}),
          })
          .eq("retell_call_id", voiceCall.retell_call_id);
      }
    } else {
      console.warn(`[Twilio Status] No voice_call found for Twilio SID: ${callSid}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[Twilio Status] Error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
