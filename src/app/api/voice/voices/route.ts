import { NextResponse } from "next/server";
import { listVoices } from "@/lib/voice/retell-client";

// =============================================
// Voice List API
// GET: List available voices from Retell AI
// =============================================

export async function GET() {
  try {
    const voices = await listVoices();
    return NextResponse.json({ voices });
  } catch (error) {
    console.error("[Voice Voices] Error:", error);
    return NextResponse.json({ error: "Failed to fetch voices" }, { status: 500 });
  }
}
