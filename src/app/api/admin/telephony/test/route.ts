import { NextResponse } from "next/server";

// =============================================
// Admin Telephony Test API
// POST: Test telephony configuration
// =============================================

export async function POST() {
  try {
    const checks = [];
    let allPassed = true;

    // Check Twilio configuration
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      checks.push({ service: "Twilio", status: "configured", message: "Credentials available" });
    } else {
      checks.push({ service: "Twilio", status: "error", message: "Missing credentials" });
      allPassed = false;
    }

    // Check Twilio voice number
    if (process.env.TWILIO_VOICE_NUMBER) {
      checks.push({ service: "Twilio Voice Number", status: "configured", message: process.env.TWILIO_VOICE_NUMBER });
    } else {
      checks.push({ service: "Twilio Voice Number", status: "warning", message: "Not configured" });
    }

    // Check Retell AI configuration
    if (process.env.RETELL_API_KEY && process.env.RETELL_LLM_ID) {
      checks.push({ service: "Retell AI", status: "configured", message: "API key and LLM ID available" });
    } else {
      checks.push({ service: "Retell AI", status: "error", message: "Missing API key or LLM ID" });
      allPassed = false;
    }

    // Check webhook URL
    const webhookUrl = process.env.RETELL_WEBHOOK_URL || `${process.env.NEXT_PUBLIC_APP_URL}/api/voice/webhook`;
    if (webhookUrl && webhookUrl.startsWith('https://')) {
      checks.push({ service: "Webhook URL", status: "configured", message: webhookUrl });
    } else {
      checks.push({ service: "Webhook URL", status: "warning", message: "Invalid or missing HTTPS webhook URL" });
    }

    // Check SIP trunk status
    if (process.env.SIP_TRUNK_CONFIGURED === "true") {
      checks.push({ service: "SIP Trunk", status: "configured", message: "Inbound calls enabled" });
    } else {
      checks.push({ service: "SIP Trunk", status: "warning", message: "Inbound calls not configured" });
    }

    return NextResponse.json({
      status: allPassed ? "success" : "partial",
      message: allPassed ? "All critical services configured" : "Some services need configuration",
      checks,
    });
  } catch (error) {
    console.error("[Admin Telephony Test] Error:", error);
    return NextResponse.json({
      status: "error",
      message: "Failed to test configuration",
      error: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
}
