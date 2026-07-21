import { NextResponse } from "next/server";
import { requireSession, AuthError } from "@/lib/auth/session";
import { registerBookingToolsOnLLM } from "@/lib/voice/retell-client";

// =============================================
// One-off: register the booking custom functions on the shared Retell LLM.
// The project has no tsx runner, so this guarded route stands in for a script.
// New agents self-register on create/sync; run this once to backfill the
// existing shared LLM (RETELL_LLM_ID). Idempotent.
//   curl -X POST https://<host>/api/debug/register-voice-tools -b "<session cookie>"
// =============================================

export async function POST() {
  try {
    await requireSession();

    const llmId = process.env.RETELL_LLM_ID;
    if (!llmId) {
      return NextResponse.json({ error: "RETELL_LLM_ID is not configured" }, { status: 500 });
    }

    await registerBookingToolsOnLLM(llmId);
    return NextResponse.json({ registered: true, llmId });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[Debug] Register voice tools error:", error);
    return NextResponse.json(
      { error: "Failed to register voice tools", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
