import { NextRequest, NextResponse } from "next/server";
import Retell from "retell-sdk";

// =============================================
// Web Call API (browser-based test calls)
// POST: Create a web call session for in-browser testing
// =============================================

export async function POST(request: NextRequest) {
  try {
    const { agentId } = await request.json();

    if (!agentId) {
      return NextResponse.json({ error: "agentId is required" }, { status: 400 });
    }

    const apiKey = process.env.RETELL_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Retell API key not configured" }, { status: 500 });
    }

    const client = new Retell({ apiKey });

    const webCallResponse = await client.call.createWebCall({
      agent_id: agentId,
    });

    return NextResponse.json({
      accessToken: webCallResponse.access_token,
      callId: webCallResponse.call_id,
    });
  } catch (error) {
    console.error("[Voice WebCall] Error:", error);
    return NextResponse.json({ error: "Failed to create web call" }, { status: 500 });
  }
}
