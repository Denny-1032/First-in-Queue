import Retell from "retell-sdk";

let retellClient: Retell | null = null;

function getRetellClient() {
  if (!retellClient) {
    const apiKey = process.env.RETELL_API_KEY;
    if (!apiKey) throw new Error("RETELL_API_KEY not configured.");
    retellClient = new Retell({ apiKey });
  }
  return retellClient;
}

function getTelnyxApiKey() {
  const key = process.env.TELNYX_API_KEY;
  if (!key) throw new Error("TELNYX_API_KEY not configured.");
  return key;
}

function getTelnyxAppId() {
  const id = process.env.TELNYX_APP_ID;
  if (!id) throw new Error("TELNYX_APP_ID not configured. Set this to your Telnyx Voice API Application (connection_id).");
  return id;
}

/**
 * Encode metadata into base64 client_state for Telnyx.
 * Telnyx passes this back in every webhook so we can identify the call.
 */
export function encodeTelnyxClientState(data: Record<string, string>): string {
  return Buffer.from(JSON.stringify(data)).toString("base64");
}

export function decodeTelnyxClientState(clientState: string): Record<string, string> {
  try {
    return JSON.parse(Buffer.from(clientState, "base64").toString("utf8"));
  } catch {
    return {};
  }
}

/**
 * Transfer an active call leg to Retell SIP.
 * Called from the telnyx-status webhook on call.answered.
 */
export async function transferToRetellSip(
  callControlId: string,
  retellCallId: string
): Promise<void> {
  const sipUri = `sip:${retellCallId}@sip.retellai.com;transport=tcp`;
  const url = `https://api.telnyx.com/v2/calls/${encodeURIComponent(callControlId)}/actions/transfer`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getTelnyxApiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ to: sipUri }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Telnyx transfer failed (${res.status}): ${text}`);
  }

  console.log(`[TelnyxClient] Transferred ${callControlId} → ${sipUri}`);
}

/**
 * Hang up an active Telnyx call leg (used for AMD - answering machine detection).
 */
export async function hangupTelnyxCall(callControlId: string): Promise<void> {
  const url = `https://api.telnyx.com/v2/calls/${encodeURIComponent(callControlId)}/actions/hangup`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getTelnyxApiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({}),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(`[TelnyxClient] Hangup failed (${res.status}): ${text}`);
  }
}

/**
 * Make an outbound call via Telnyx + Retell Custom Telephony.
 *
 * Flow:
 * 1. Register the call with Retell → get retell call_id
 * 2. Store retell_call_id in Telnyx client_state (comes back in every webhook)
 * 3. Telnyx dials the customer's PSTN number
 * 4. On call.answered webhook → we call transferToRetellSip()
 * 5. Telnyx bridges the PSTN call into Retell's SIP endpoint
 * 6. Retell AI handles STT/LLM/TTS
 * 7. On call.hangup → we record usage via telnyx-status webhook
 *
 * Cost note: Uses "local" rate ($0.145/min) when TELNYX_VOICE_NUMBER is a
 * Zambian (+260) number. Non-local rate ($0.51-0.54/min) otherwise.
 */
export async function makeOutboundCallViaTelnyx(params: {
  fromNumber: string;
  toNumber: string;
  retellAgentId: string;
  metadata?: Record<string, string>;
  dynamicVariables?: Record<string, string>;
  maxCallDurationSeconds?: number;
}) {
  console.log(`[TelnyxCall] Initiating: from=${params.fromNumber} to=${params.toNumber} agent=${params.retellAgentId}`);

  const retell = getRetellClient();

  // Step 1: Register the call with Retell to get a call_id.
  let registered;
  try {
    registered = await retell.call.registerPhoneCall({
      agent_id: params.retellAgentId,
      direction: "outbound",
      from_number: params.fromNumber,
      to_number: params.toNumber,
      metadata: params.metadata,
      retell_llm_dynamic_variables: params.dynamicVariables,
    });
    console.log(`[TelnyxCall] Retell registered: call_id=${registered.call_id}`);
  } catch (retellErr) {
    console.error(`[TelnyxCall] Retell registration FAILED:`, retellErr);
    throw new Error(
      `Retell registration failed: ${retellErr instanceof Error ? retellErr.message : String(retellErr)}`
    );
  }

  const retellCallId = registered.call_id;

  // Step 2: Build client_state — passed back in every Telnyx webhook.
  // This allows the webhook handler to find retell_call_id without a DB lookup.
  const clientStateData: Record<string, string> = {
    retell_call_id: retellCallId,
    ...(params.metadata || {}),
  };
  const clientState = encodeTelnyxClientState(clientStateData);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  const webhookUrl = appUrl ? `${appUrl}/api/voice/telnyx-status` : undefined;

  const maxDuration = params.maxCallDurationSeconds || 300;

  // Step 3: Create the Telnyx outbound call.
  let telnyxCallData: { call_control_id: string; call_leg_id: string; call_session_id: string };
  try {
    const res = await fetch("https://api.telnyx.com/v2/calls", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${getTelnyxApiKey()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: params.toNumber,
        from: params.fromNumber,
        connection_id: getTelnyxAppId(),
        client_state: clientState,
        timeout_secs: 30,
        time_limit_secs: maxDuration,
        // AMD: detect answering machines and hang up to save costs
        answering_machine_detection: "detect_beep",
        answering_machine_detection_config: {
          after_greeting_silence_millis: 800,
          maximum_number_of_words: 5,
        },
        ...(webhookUrl
          ? { webhook_url: webhookUrl, webhook_url_method: "POST" }
          : {}),
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Telnyx API error (${res.status}): ${errText}`);
    }

    const body = await res.json();
    telnyxCallData = body.data;
    console.log(
      `[TelnyxCall] Telnyx call created: call_leg_id=${telnyxCallData.call_leg_id} control_id=${telnyxCallData.call_control_id}`
    );
  } catch (telnyxErr) {
    console.error(`[TelnyxCall] Telnyx call creation FAILED:`, telnyxErr);
    throw new Error(
      `Telnyx call failed: ${telnyxErr instanceof Error ? telnyxErr.message : String(telnyxErr)}`
    );
  }

  return {
    call_id: telnyxCallData.call_leg_id,
    call_control_id: telnyxCallData.call_control_id,
    call_session_id: telnyxCallData.call_session_id,
    retell_call_id: retellCallId,
  };
}
