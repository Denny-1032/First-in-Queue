import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { sendEmail, emailShell } from "@/lib/email/send";

// =============================================
// Cron: stale install detector (spec §5, step 6).
// ---------------------------------------------
// Any property that was verified but hasn't sent a heartbeat in 14 days flips to
// `stale` and its owner is emailed once. This catches the silent, common,
// revenue-losing failure: a site redesign drops the snippet and nobody notices.
//
// Logic lives in GET — Vercel cron issues GET, and this repo has previously
// shipped crons that silently never ran because the job was POST-only. Scheduled
// from .github/workflows/stale-installs.yml (Vercel Hobby allows only daily crons
// and vercel.json already holds two).
//
// Idempotent: only properties currently 'verified' are considered, so a property
// already flipped to 'stale' is never re-emailed.
// =============================================

const STALE_AFTER_DAYS = 14;

async function runStaleCheck(request: NextRequest) {
  // Middleware exempts /api/cron/*, so this bearer check IS the authorization.
  // Unset secret is tolerated locally but fails closed in production rather than
  // leaving a public endpoint that emails customers.
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    if (process.env.NODE_ENV === "production") {
      console.error("[Cron/stale-installs] CRON_SECRET is not set — refusing to run.");
      return NextResponse.json({ error: "Cron secret not configured" }, { status: 503 });
    }
  } else {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const db = getSupabaseAdmin();
  const cutoff = new Date(Date.now() - STALE_AFTER_DAYS * 24 * 60 * 60 * 1000).toISOString();

  // Only 'verified' rows transition — that filter IS the idempotency guard.
  const { data: properties, error } = await db
    .from("properties")
    .select("id, tenant_id, name, site_url, last_seen_at")
    .eq("install_status", "verified")
    .lt("last_seen_at", cutoff);

  if (error) {
    console.error("[Cron/stale-installs] query failed:", error.message);
    return NextResponse.json({ error: "Query failed" }, { status: 500 });
  }

  const stale = properties ?? [];
  let flipped = 0;
  let emailed = 0;

  for (const property of stale) {
    const { error: updateError } = await db
      .from("properties")
      .update({ install_status: "stale", updated_at: new Date().toISOString() })
      .eq("id", property.id)
      // Re-assert the precondition so two overlapping runs can't both flip it.
      .eq("install_status", "verified");

    if (updateError) {
      console.error(`[Cron/stale-installs] flip failed for ${property.id}:`, updateError.message);
      continue;
    }
    flipped++;

    // Notify the tenant owner. A send failure must not abort the sweep.
    try {
      const { data: owner } = await db
        .from("users")
        .select("email, name")
        .eq("tenant_id", property.tenant_id)
        .eq("role", "owner")
        .limit(1)
        .maybeSingle();

      if (owner?.email) {
        const site = property.site_url || property.name;
        await sendEmail({
          to: owner.email as string,
          subject: `Your chat widget has stopped appearing on ${site}`,
          html: emailShell(`
            <h2 style="color:#111;font-size:20px;margin:0 0 8px">We haven't seen your chat widget in ${STALE_AFTER_DAYS} days</h2>
            <p style="color:#555;font-size:14px;line-height:1.6;margin:0 0 16px">
              The First in Queue widget for <strong>${property.name}</strong> was working, but it
              hasn't loaded on your site for ${STALE_AFTER_DAYS} days. This usually means the
              install snippet was removed — often after a theme change or site redesign.
            </p>
            <p style="color:#555;font-size:14px;line-height:1.6;margin:0 0 24px">
              While it's missing, customer questions on your website go unanswered.
            </p>
            <a href="https://firstinqueue.com/dashboard/properties" style="display:inline-block;background:#059669;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:600">
              Get your install snippet
            </a>
          `),
        });
        emailed++;
      }
    } catch (e) {
      console.error(
        `[Cron/stale-installs] email failed for ${property.id}:`,
        e instanceof Error ? e.message : e
      );
    }
  }

  console.log(`[Cron/stale-installs] checked=${stale.length} flipped=${flipped} emailed=${emailed}`);
  return NextResponse.json({
    checked: stale.length,
    flipped,
    emailed,
    stale_after_days: STALE_AFTER_DAYS,
  });
}

export async function GET(request: NextRequest) {
  return runStaleCheck(request);
}

// Accepted so a manual POST doesn't silently do nothing.
export async function POST(request: NextRequest) {
  return runStaleCheck(request);
}
