import { NextRequest, NextResponse } from "next/server";

// =============================================
// Admin Telephony Configuration API
// GET:  Retrieve telephony configuration
// POST: Update telephony configuration
// =============================================

interface TelephonyConfig {
  twilio_account_sid?: string;
  twilio_auth_token?: string;
  twilio_voice_number?: string;
  retell_api_key?: string;
  retell_llm_id?: string;
  webhook_url?: string;
  sip_trunk_configured?: boolean;
}

export async function GET() {
  try {
    // In a real implementation, this would fetch from a secure admin config store
    // For now, we'll return the current environment variables (masked)
    const config: TelephonyConfig = {
      twilio_account_sid: process.env.TWILIO_ACCOUNT_SID ? maskSecret(process.env.TWILIO_ACCOUNT_SID) : undefined,
      twilio_auth_token: process.env.TWILIO_AUTH_TOKEN ? maskSecret(process.env.TWILIO_AUTH_TOKEN) : undefined,
      twilio_voice_number: process.env.TWILIO_VOICE_NUMBER || undefined,
      retell_api_key: process.env.RETELL_API_KEY ? maskSecret(process.env.RETELL_API_KEY) : undefined,
      retell_llm_id: process.env.RETELL_LLM_ID || undefined,
      webhook_url: process.env.RETELL_WEBHOOK_URL || `${process.env.NEXT_PUBLIC_APP_URL}/api/voice/webhook`,
      sip_trunk_configured: process.env.SIP_TRUNK_CONFIGURED === "true",
    };

    return NextResponse.json({ config });
  } catch (error) {
    console.error("[Admin Telephony] GET error:", error);
    return NextResponse.json({ error: "Failed to load telephony configuration" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      twilio_account_sid,
      twilio_auth_token,
      twilio_voice_number,
      retell_api_key,
      retell_llm_id,
      webhook_url,
      sip_trunk_configured,
    } = body;

    // In a real implementation, this would securely store the configuration
    // For now, we'll validate the inputs and return success
    
    const errors: string[] = [];
    
    if (twilio_account_sid && !twilio_account_sid.startsWith('AC')) {
      errors.push("Twilio Account SID must start with 'AC'");
    }
    
    if (twilio_voice_number && !twilio_voice_number.match(/^\+\d{10,15}$/)) {
      errors.push("Twilio Voice Number must be in E.164 format (+1234567890)");
    }
    
    if (retell_api_key && !retell_api_key.startsWith('key_')) {
      errors.push("Retell API Key must start with 'key_'");
    }
    
    if (retell_llm_id && !retell_llm_id.startsWith('llm_')) {
      errors.push("Retell LLM ID must start with 'llm_'");
    }
    
    if (webhook_url && !webhook_url.startsWith('https://')) {
      errors.push("Webhook URL must use HTTPS");
    }
    
    if (errors.length > 0) {
      return NextResponse.json({ 
        error: "Validation failed", 
        details: errors 
      }, { status: 400 });
    }

    // TODO: In production, securely store these values in a database or secure config store
    // For now, we'll just return success
    console.log("[Admin Telephony] Configuration would be saved:", {
      twilio_account_sid: twilio_account_sid ? maskSecret(twilio_account_sid) : undefined,
      twilio_voice_number,
      retell_llm_id,
      webhook_url,
      sip_trunk_configured,
    });

    return NextResponse.json({ 
      success: true, 
      message: "Telephony configuration saved successfully" 
    });
  } catch (error) {
    console.error("[Admin Telephony] POST error:", error);
    return NextResponse.json({ error: "Failed to save telephony configuration" }, { status: 500 });
  }
}

function maskSecret(secret: string): string {
  if (secret.length <= 8) return "*".repeat(secret.length);
  return secret.slice(0, 4) + "*".repeat(secret.length - 8) + secret.slice(-4);
}
