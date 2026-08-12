import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { hashPassword, generateAuthToken } from "@/lib/auth/password";

const TOKEN_TTL_MS = 72 * 60 * 60 * 1000; // 72 hours

// Why the caller gets a specific reason: every failure used to collapse into one
// "invalid or expired" sentence, so nobody - including us - could tell a superseded
// link from an accepted one. The four cases have four different next actions.
type InvalidReason = "missing" | "not_found" | "already_used" | "expired";

// GET - validate token, return agent name + business name
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.json({ valid: false, reason: "missing" satisfies InvalidReason });

  const db = getSupabaseAdmin();
  const { data: agent } = await db
    .from("agents")
    .select("id, name, email, tenant_id, invite_token, invite_sent_at, invite_accepted_at")
    .eq("invite_token", token)
    .single();

  // No row: the token was replaced by a newer invite, or was never real. Accepting
  // an invite no longer clears invite_token, so an accepted link still matches its
  // row and reports "already_used" below instead of landing here.
  if (!agent) {
    return NextResponse.json({ valid: false, reason: "not_found" satisfies InvalidReason });
  }

  if (agent.invite_accepted_at) {
    return NextResponse.json({ valid: false, reason: "already_used" satisfies InvalidReason });
  }

  // Check expiry
  if (agent.invite_sent_at) {
    const sentAt = new Date(agent.invite_sent_at).getTime();
    if (Date.now() - sentAt > TOKEN_TTL_MS) {
      return NextResponse.json({ valid: false, reason: "expired" satisfies InvalidReason });
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

  // Does this email already have an account? If so the accept screen skips the
  // password fields entirely - see the POST branch below, which never touches an
  // existing user's password.
  let existingUser = false;
  if (agent.email) {
    const { data: user } = await db
      .from("users")
      .select("id")
      .eq("email", agent.email.toLowerCase())
      .single();
    existingUser = !!user;
  }

  return NextResponse.json({ valid: true, name: agent.name, businessName, existingUser });
}

// POST - accept invite. New email: create the user and sign them in.
// Known email: add the membership only, and send them to sign in themselves.
export async function POST(request: NextRequest) {
  try {
    const { token, password } = await request.json();

    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 });
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
      return NextResponse.json({ error: "Agent has no email - contact your admin" }, { status: 400 });
    }

    // Check if user already exists for this email
    const { data: existingUser } = await db
      .from("users")
      .select("id")
      .eq("email", agent.email.toLowerCase())
      .single();

    let userId: string;

    if (existingUser) {
      // Existing user joining another team. Their password and their default
      // tenant_id are theirs - clicking an invite link is not proof of either, and
      // overwriting them used to lock people out of their own account and drag
      // their default workspace to whichever invite was accepted last. The
      // user_tenants row below is the whole of the membership.
      userId = existingUser.id;
    } else {
      // Brand-new user - this is the only path that sets a password.
      if (!password) {
        return NextResponse.json({ error: "Password is required" }, { status: 400 });
      }
      if (password.length < 8) {
        return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
      }

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

    // Add user↔tenant membership (safe upsert - no error if already exists)
    await db.from("user_tenants").upsert({
      user_id: userId,
      tenant_id: agent.tenant_id,
      role: "agent",
    }, { onConflict: "user_id,tenant_id" });

    // Mark invite as accepted and link user_id. invite_token is deliberately left
    // in place: both GET and POST gate on invite_accepted_at, so the spent token
    // grants nothing, and keeping it is what lets a second click on the same link
    // find the row and say "already used" instead of "invalid".
    await db
      .from("agents")
      .update({
        invite_accepted_at: new Date().toISOString(),
        user_id: userId,
      })
      .eq("id", agent.id);

    // Existing account: no session. The invite link proves the admin knows this
    // email, not that the clicker holds its password - they sign in as themselves.
    if (existingUser) {
      return NextResponse.json({ success: true, existingAccount: true });
    }

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
