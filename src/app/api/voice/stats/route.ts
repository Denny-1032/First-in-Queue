import { NextRequest, NextResponse } from "next/server";
import { getVoiceStats, checkVoiceMinutes } from "@/lib/voice/usage";

// =============================================
// Voice Stats API
// GET: Get voice usage stats for a tenant
// =============================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get("tenantId");

    if (!tenantId) {
      return NextResponse.json({ error: "tenantId is required" }, { status: 400 });
    }

    const [stats, minutes] = await Promise.all([
      getVoiceStats(tenantId),
      checkVoiceMinutes(tenantId),
    ]);

    return NextResponse.json({
      ...stats,
      voiceMinutes: {
        used: minutes.used,
        limit: minutes.limit,
        remaining: minutes.remaining,
      },
    });
  } catch (error) {
    console.error("[Voice Stats] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
