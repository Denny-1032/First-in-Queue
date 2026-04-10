import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import {
  decodeTelnyxClientState,
  transferToRetellSip,
  hangupTelnyxCall,
} from "@/lib/voice/telnyx-client";

/**
 * Telnyx Voice Webhook Handler
 *
 * Receives JSON POST events from Telnyx for all call lifecycle events.
 * Key events handled:
 *   - call.initiated        → update DB status to registered
 *   - call.answered         → transfer PSTN leg to Retell SIP
 *   - call.machine.detection.ended → hang up if answering machine detected
 *   - call.hangup           → record voice usage, update DB, update scheduled_calls
 *
 * The retell_call_id is recovered from payload.client_state (base64 JSON)
 * set at call creation time — no DB round-trip needed for bridging.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { event_type, payload } = body.data ?? {};

    if (!event_type || !payload) {
      return NextResponse.json({ error: "Invalid webhook payload" }, { status: 400 });
    }

    const {
      call_control_id,
      call_leg_id,
      client_state,
      from,
      to,
      direction,
      start_time,
      end_time,
      hangup_cause,
      result: amdResult,
    } = payload;

    console.log(`[Telnyx Webhook] event=${event_type} leg=${call_leg_id} from=${from} to=${to}`);

    // Decode client_state to retrieve retell_call_id and tenant metadata
    const state = client_state ? decodeTelnyxClientState(client_state) : {};
    const retellCallId = state.retell_call_id;
    const tenantId = state.tenant_id;

    const supabase = getSupabaseAdmin();

    // ─── call.answered ────────────────────────────────────────────────────────
    // Customer picked up. Bridge the PSTN call leg to Retell AI via SIP transfer.
    if (event_type === "call.answered") {
      if (!retellCallId) {
        console.error(`[Telnyx Webhook] call.answered but no retell_call_id in client_state for leg ${call_leg_id}`);
        return NextResponse.json({ received: true });
      }

      try {
        await transferToRetellSip(call_control_id, retellCallId);
        console.log(`[Telnyx Webhook] Bridged ${call_leg_id} to Retell SIP (retell_call_id=${retellCallId})`);
      } catch (bridgeErr) {
        console.error(`[Telnyx Webhook] SIP bridge FAILED for ${call_leg_id}:`, bridgeErr);
      }

      // Update voice_calls status to ongoing
      await supabase
        .from("voice_calls")
        .update({ status: "ongoing", updated_at: new Date().toISOString() })
        .filter("metadata->>telnyx_call_id", "eq", call_leg_id);

      return NextResponse.json({ received: true });
    }

    // ─── call.machine.detection.ended ─────────────────────────────────────────
    // AMD fired. If machine/voicemail detected, hang up to avoid wasted minutes.
    if (event_type === "call.machine.detection.ended") {
      const isMachine = amdResult && amdResult !== "not_sure" && amdResult !== "human";
      if (isMachine) {
        console.log(`[Telnyx Webhook] AMD: machine detected (${amdResult}) — hanging up ${call_leg_id}`);
        try {
          await hangupTelnyxCall(call_control_id);
        } catch (err) {
          console.error(`[Telnyx Webhook] AMD hangup failed for ${call_leg_id}:`, err);
        }
      }
      return NextResponse.json({ received: true });
    }

    // ─── call.hangup ──────────────────────────────────────────────────────────
    // Call ended. Calculate duration, record voice usage, update DB records.
    if (event_type === "call.hangup") {
      let durationSeconds = 0;
      if (start_time && end_time) {
        durationSeconds = Math.max(
          0,
          Math.floor(
            (new Date(end_time).getTime() - new Date(start_time).getTime()) / 1000
          )
        );
      }

      const isFailed = ["user_busy", "no_answer", "call_rejected", "unallocated_number"].includes(
        hangup_cause || ""
      );
      const mappedStatus = isFailed ? "error" : "ended";

      const updateData: Record<string, unknown> = {
        status: mappedStatus,
        ended_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        ...(durationSeconds > 0 ? { duration_seconds: durationSeconds } : {}),
        ...(hangup_cause ? { metadata: { hangup_cause, telnyx_direction: direction } } : {}),
      };

      // Look up the voice call by telnyx_call_id in metadata
      const { data: voiceCall } = await supabase
        .from("voice_calls")
        .select("id, tenant_id, retell_call_id, metadata")
        .filter("metadata->>telnyx_call_id", "eq", call_leg_id)
        .limit(1)
        .maybeSingle();

      if (voiceCall) {
        await supabase
          .from("voice_calls")
          .update(updateData)
          .eq("id", voiceCall.id);

        const resolvedTenantId = voiceCall.tenant_id || tenantId;

        // Note: Voice usage is recorded by the Retell webhook (voice/webhook/route.ts)
        // to avoid double-counting since both webhooks fire for the same call.

        // Update scheduled_calls if applicable
        const resolvedRetellCallId = voiceCall.retell_call_id || retellCallId;
        if (resolvedRetellCallId) {
          const finalStatus = mappedStatus === "ended" ? "completed" : "failed";
          await supabase
            .from("scheduled_calls")
            .update({
              status: finalStatus,
              updated_at: new Date().toISOString(),
              ...(isFailed ? { error_message: `Call ${hangup_cause}` } : {}),
            })
            .eq("retell_call_id", resolvedRetellCallId);
        }

        console.log(
          `[Telnyx Webhook] call.hangup processed: leg=${call_leg_id} status=${mappedStatus} duration=${durationSeconds}s cause=${hangup_cause}`
        );
      } else {
        // Fallback: try matching by retell_call_id from client_state
        if (retellCallId) {
          const { data: retellVoiceCall } = await supabase
            .from("voice_calls")
            .select("id, tenant_id, metadata")
            .eq("retell_call_id", retellCallId)
            .limit(1)
            .maybeSingle();

          if (retellVoiceCall) {
            await supabase
              .from("voice_calls")
              .update(updateData)
              .eq("id", retellVoiceCall.id);

            // Voice usage recorded by Retell webhook (voice/webhook/route.ts)
          } else {
            console.warn(`[Telnyx Webhook] No voice_call found for leg=${call_leg_id} retell=${retellCallId}`);
          }
        }
      }

      return NextResponse.json({ received: true });
    }

    // ─── call.initiated ───────────────────────────────────────────────────────
    if (event_type === "call.initiated") {
      await supabase
        .from("voice_calls")
        .update({ status: "registered", updated_at: new Date().toISOString() })
        .filter("metadata->>telnyx_call_id", "eq", call_leg_id);

      return NextResponse.json({ received: true });
    }

    // All other events — acknowledge without processing
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[Telnyx Webhook] Error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
