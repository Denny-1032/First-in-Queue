import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { makeOutboundCallViaTwilio } from "@/lib/voice/twilio-client";

const DEMO_AGENT_ID = process.env.RETELL_DEMO_AGENT_ID;
const DEMO_PHONE = process.env.TWILIO_VOICE_NUMBER;
const RATE_LIMIT_WINDOW = 24 * 60 * 60 * 1000; // 24 hours
const MAX_CALLS_PER_IP = 1;

// Simple in-memory rate limit store (in production, use Redis)
const rateLimitStore = new Map<string, { count: number; lastCall: number }>();

function getClientIP(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitStore.get(ip);

  if (!record) {
    rateLimitStore.set(ip, { count: 1, lastCall: now });
    return true;
  }

  // Reset if window expired
  if (now - record.lastCall > RATE_LIMIT_WINDOW) {
    rateLimitStore.set(ip, { count: 1, lastCall: now });
    return true;
  }

  // Check limit
  if (record.count >= MAX_CALLS_PER_IP) {
    return false;
  }

  record.count++;
  record.lastCall = now;
  return true;
}

export async function POST(request: NextRequest) {
  try {
    const { phoneNumber } = await request.json();

    if (!phoneNumber || !/^\+?[1-9]\d{1,14}$/.test(phoneNumber)) {
      return NextResponse.json(
        { error: "Invalid phone number" },
        { status: 400 }
      );
    }

    // Rate limiting
    const ip = getClientIP(request);
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: "Demo call limit reached (1 per day)" },
        { status: 429 }
      );
    }

    if (!DEMO_AGENT_ID || !DEMO_PHONE) {
      return NextResponse.json(
        { error: "Demo calls coming soon! We're setting up the voice line." },
        { status: 503 }
      );
    }

    // Create a 15-second demo call
    const call = await makeOutboundCallViaTwilio({
      toNumber: phoneNumber,
      fromNumber: DEMO_PHONE,
      retellAgentId: DEMO_AGENT_ID,
      metadata: {
        source: "demo",
        purpose: "sales_demo",
      },
      dynamicVariables: {
        custom_prompt: `You are a sales assistant from First in Queue (FiQ). 
        You have exactly 15 seconds to:
        1. Introduce yourself and FiQ
        2. Mention we provide AI customer care for WhatsApp and voice
        3. Say you'll call them back with more details
        4. End the call
        
        Be friendly, professional, and keep it brief. The call will auto-disconnect after 15 seconds.`,
      },
    });

    // Log the demo call for analytics
    const supabase = getSupabaseAdmin();
    await supabase.from("demo_calls").insert({
      phone_number: phoneNumber,
      ip_address: ip,
      status: "initiated",
      twilio_call_sid: call.call_id,
    });

    return NextResponse.json({
      success: true,
      message: "Demo call initiated! You'll receive a call in 10-15 seconds.",
      callId: call.call_id,
    });
  } catch (error) {
    console.error("[DEMO_CALL] Error:", error);
    return NextResponse.json(
      { error: "Failed to initiate demo call" },
      { status: 500 }
    );
  }
}
