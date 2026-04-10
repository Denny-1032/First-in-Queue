import twilio from "twilio";
import Retell from "retell-sdk";

let twilioClient: ReturnType<typeof twilio> | null = null;
let retellClient: Retell | null = null;

export function getTwilioClient() {
  if (!twilioClient) {
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    if (!sid || !token) {
      throw new Error(
        "Twilio credentials not configured. Set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN."
      );
    }
    twilioClient = twilio(sid, token);
  }
  return twilioClient;
}

function getRetellClient() {
  if (!retellClient) {
    const apiKey = process.env.RETELL_API_KEY;
    if (!apiKey) {
      throw new Error("RETELL_API_KEY not configured.");
    }
    retellClient = new Retell({ apiKey });
  }
  return retellClient;
}

/**
 * Make an outbound call via Twilio + Retell Custom Telephony.
 *
 * Flow (Dial-to-SIP method from Retell docs):
 * 1. Register a phone call with Retell → get call_id
 * 2. Twilio calls the customer
 * 3. When customer answers, TwiML dials sip:{call_id}@sip.retellai.com
 * 4. Retell handles STT/LLM/TTS on the connected audio
 *
 * This bypasses Retell's outbound identity verification because
 * Twilio initiates the PSTN call, not Retell.
 */
export async function makeOutboundCallViaTwilio(params: {
  fromNumber: string;
  toNumber: string;
  retellAgentId: string;
  metadata?: Record<string, string>;
  dynamicVariables?: Record<string, string>;
  maxCallDurationSeconds?: number;
}) {
  console.log(`[TwilioCall] Initiating: from=${params.fromNumber} to=${params.toNumber} agent=${params.retellAgentId}`);
  const client = getTwilioClient();
  const retell = getRetellClient();

  // Step 1: Register the call with Retell to get a call_id.
  // The call_id is used as the SIP user part: sip:{call_id}@sip.retellai.com
  // Timeout is 5 minutes from registration.
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
    console.log(`[TwilioCall] Retell registered: call_id=${registered.call_id}`);
  } catch (retellErr) {
    console.error(`[TwilioCall] Retell registration FAILED:`, retellErr);
    throw new Error(`Retell registration failed: ${retellErr instanceof Error ? retellErr.message : String(retellErr)}`);
  }

  const retellCallId = registered.call_id;

  // Step 2: Build TwiML that dials the Retell SIP URI when customer answers.
  // - timeout: how many seconds to ring before giving up (default 30)
  // - timeLimit: max seconds the connected call can last (prevents runaway charges)
  const sipUri = `sip:${retellCallId}@sip.retellai.com;transport=tcp`;
  const maxDuration = params.maxCallDurationSeconds || 180; // default 3 minutes
  const twiml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    "<Response>",
    `  <Dial timeout="30" timeLimit="${maxDuration}">`,
    `    <Sip>${sipUri}</Sip>`,
    "  </Dial>",
    "</Response>",
  ].join("\n");
  console.log(`[TwilioCall] TwiML: timeout=30s, timeLimit=${maxDuration}s`);

  const statusCallbackUrl = process.env.NEXT_PUBLIC_APP_URL
    ? `${process.env.NEXT_PUBLIC_APP_URL}/api/voice/twilio-status`
    : undefined;

  // Step 3: Twilio calls the customer's phone number.
  let call;
  try {
    call = await client.calls.create({
      from: params.fromNumber,
      to: params.toNumber,
      twiml,
      // Answering machine detection: hang up if voicemail answers
      machineDetection: "DetectMessageEnd" as "Enable" | "DetectMessageEnd",
      asyncAmd: "true",
      asyncAmdStatusCallback: statusCallbackUrl,
      asyncAmdStatusCallbackMethod: "POST",
      // Limit total ring time (seconds Twilio waits for customer to pick up)
      timeout: 30,
      ...(statusCallbackUrl
        ? {
            statusCallback: statusCallbackUrl,
            statusCallbackEvent: [
              "initiated",
              "ringing",
              "answered",
              "completed",
            ],
            statusCallbackMethod: "POST" as const,
          }
        : {}),
    });
    console.log(`[TwilioCall] Twilio call created: sid=${call.sid} status=${call.status}`);
  } catch (twilioErr) {
    console.error(`[TwilioCall] Twilio call creation FAILED:`, twilioErr);
    throw new Error(`Twilio call failed: ${twilioErr instanceof Error ? twilioErr.message : String(twilioErr)}`);
  }

  return {
    call_id: call.sid,
    retell_call_id: retellCallId,
    status: call.status,
  };
}
