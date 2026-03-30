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
}) {
  const client = getTwilioClient();
  const retell = getRetellClient();

  // Step 1: Register the call with Retell to get a call_id.
  // The call_id is used as the SIP user part: sip:{call_id}@sip.retellai.com
  // Timeout is 5 minutes from registration.
  const registered = await retell.call.registerPhoneCall({
    agent_id: params.retellAgentId,
    direction: "outbound",
    from_number: params.fromNumber,
    to_number: params.toNumber,
    metadata: params.metadata,
    retell_llm_dynamic_variables: params.dynamicVariables,
  });

  const retellCallId = registered.call_id;

  // Step 2: Build TwiML that dials the Retell SIP URI when customer answers.
  const sipUri = `sip:${retellCallId}@sip.retellai.com;transport=tcp`;
  const twiml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    "<Response>",
    "  <Dial>",
    `    <Sip>${sipUri}</Sip>`,
    "  </Dial>",
    "</Response>",
  ].join("\n");

  const statusCallbackUrl = process.env.NEXT_PUBLIC_APP_URL
    ? `${process.env.NEXT_PUBLIC_APP_URL}/api/voice/twilio-status`
    : undefined;

  // Step 3: Twilio calls the customer's phone number.
  const call = await client.calls.create({
    from: params.fromNumber,
    to: params.toNumber,
    twiml,
    ...(statusCallbackUrl
      ? {
          statusCallback: statusCallbackUrl,
          statusCallbackEvent: [
            "initiated",
            "ringing",
            "answered",
            "completed",
          ],
          statusCallbackMethod: "POST",
        }
      : {}),
  });

  return {
    call_id: call.sid,
    retell_call_id: retellCallId,
    status: call.status,
  };
}
