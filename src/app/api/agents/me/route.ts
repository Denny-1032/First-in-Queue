import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { requireSession, AuthError } from "@/lib/auth/session";

/**
 * GET /api/agents/me
 * Returns the agent record linked to the currently authenticated user.
 * Matches on user_id first (invited agents), then falls back to email match.
 */
export async function GET() {
  try {
    const session = await requireSession();
    const db = getSupabaseAdmin();

    // 1. Try matching by user_id (set when agent accepts invite)
    const { data: byUserId } = await db
      .from("agents")
      .select("*")
      .eq("tenant_id", session.tenantId)
      .eq("user_id", session.userId)
      .limit(1)
      .single();

    if (byUserId) {
      return NextResponse.json(byUserId);
    }

    // 2. Fall back to email match (for the original owner whose agent record
    //    was created at signup and may not have user_id set yet)
    const { data: user } = await db
      .from("users")
      .select("email")
      .eq("id", session.userId)
      .single();

    if (user?.email) {
      const { data: byEmail } = await db
        .from("agents")
        .select("*")
        .eq("tenant_id", session.tenantId)
        .eq("email", user.email.toLowerCase())
        .limit(1)
        .single();

      if (byEmail) {
        // Back-fill user_id so future lookups are fast
        if (!byEmail.user_id) {
          await db
            .from("agents")
            .update({ user_id: session.userId })
            .eq("id", byEmail.id);
          byEmail.user_id = session.userId;
        }
        return NextResponse.json(byEmail);
      }
    }

    return NextResponse.json({ error: "No agent record found for this user" }, { status: 404 });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("[API] Error fetching current agent:", error);
    return NextResponse.json({ error: "Failed to fetch agent" }, { status: 500 });
  }
}
