import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { hashPassword, generateAuthToken } from "@/lib/auth/password";

const TOKEN_TTL_MS = 72 * 60 * 60 * 1000; // 72 hours

// GET — validate token, return agent name + business name
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.json({ valid: false });

  const db = getSupabaseAdmin();
  const { data: agent } = await db
    .from("agents")
    .select("id, name, tenant_id, invite_token, invite_sent_at, invite_accepted_at")
    .eq("invite_token", token)
    .single();

  if (!agent || agent.invite_accepted_at) {
    return NextResponse.json({ valid: false });
  }

  // Check expiry
  if (agent.invite_sent_at) {
    const sentAt = new Date(agent.invite_sent_at).getTime();
    if (Date.now() - sentAt > TOKEN_TTL_MS) {
      return NextResponse.json({ valid: false, reason: "expired" });
    }
  }

  // Get business name
  const { data: tenant } = await db
    .from("tenants")
    .select("config")
    .eq("id", agent.tenant_id)
    .single();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const businessName = (tenant?.config as any)?.business_name || "your business";

  return NextResponse.json({ valid: true, name: agent.name, businessName });
}

// POST — accept invite, create user account, set auth cookie
export async function POST(request: NextRequest) {
  try {
    const { token, password } = await request.json();

    if (!token || !password) {
      return NextResponse.json({ error: "Token and password are required" }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }

    const db = getSupabaseAdmin();

    // Fetch agent by token
    const { data: agent } = await db
      .from("agents")
      .select("id, name, email, tenant_id, invite_token, invite_sent_at, invite_accepted_at")
      .eq("invite_token", token)
      .single();

    if (!agent) {
      return NextResponse.json({ error: "Invalid invite link" }, { status: 400 });
    }

    if (agent.invite_accepted_at) {
      return NextResponse.json({ error: "This invite has already been used" }, { status: 400 });
    }

    if (agent.invite_sent_at) {
      const sentAt = new Date(agent.invite_sent_at).getTime();
      if (Date.now() - sentAt > TOKEN_TTL_MS) {
        return NextResponse.json({ error: "This invite has expired. Ask your admin to resend." }, { status: 400 });
      }
    }

    if (!agent.email) {
      return NextResponse.json({ error: "Agent has no email — contact your admin" }, { status: 400 });
    }

    // Check if user already exists for this email
    const { data: existingUser } = await db
      .from("users")
      .select("id")
      .eq("email", agent.email.toLowerCase())
      .single();

    let userId: string;

    if (existingUser) {
      // Existing user joining another team — update password
      userId = existingUser.id;
      await db.from("users").update({
        password_hash: hashPassword(password),
        tenant_id: agent.tenant_id,
      }).eq("id", userId);
    } else {
      // Brand-new user
      const { data: newUser, error: userErr } = await db
        .from("users")
        .insert({
          name: agent.name,
          email: agent.email.toLowerCase(),
          password_hash: hashPassword(password),
          tenant_id: agent.tenant_id,
          role: "agent",
        })
        .select()
        .single();

      if (userErr || !newUser) {
        console.error("[Invite Accept] Failed to create user:", userErr);
        return NextResponse.json({ error: "Failed to create account" }, { status: 500 });
      }
      userId = newUser.id;
    }

    // Add user↔tenant membership (safe upsert — no error if already exists)
    await db.from("user_tenants").upsert({
      user_id: userId,
      tenant_id: agent.tenant_id,
      role: "agent",
    }, { onConflict: "user_id,tenant_id" });

    // Mark invite as accepted and link user_id
    await db
      .from("agents")
      .update({
        invite_accepted_at: new Date().toISOString(),
        invite_token: null,
        user_id: userId,
      })
      .eq("id", agent.id);

    // Generate auth token with tenant context
    const authToken = generateAuthToken(userId, agent.email.toLowerCase(), agent.tenant_id);

    const response = NextResponse.json({ success: true });
    response.cookies.set("fiq-auth", authToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("[Invite Accept] Error:", error);
    return NextResponse.json({ error: "Failed to accept invite" }, { status: 500 });
  }
}
