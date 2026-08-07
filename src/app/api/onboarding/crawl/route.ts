import { NextRequest, NextResponse, after } from "next/server";
import { requireSession, AuthError } from "@/lib/auth/session";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { patchOnboarding } from "@/lib/onboarding/state";
import { crawlSite, CrawlError } from "@/lib/knowledge/crawl";
import { generateFaqs } from "@/lib/knowledge/faq-generator";
import { trackEvent } from "@/lib/analytics/track";
import type { Industry, KnowledgeEntry } from "@/types";

// =============================================
// Onboarding step 1 — kick off the site crawl in the background (§7).
// ---------------------------------------------
// The crawl takes tens of seconds; wizard steps 2-4 are the cover for it. We
// mark the crawl `running`, return 202 immediately, and finish the work with
// after() so navigating on doesn't cancel it. The block-11 review screen reads
// the stashed entries from onboarding.crawl. Failures fall back cleanly (spec
// step 5): status `failed` + a message, never a dead end.
// =============================================

// Keyword → industry hints for pre-selecting step 3. Deliberately crude; the
// user confirms the guess and can change it.
const INDUSTRY_HINTS: Array<[Industry, RegExp]> = [
  ["ecommerce", /\b(shop|cart|checkout|product|order|shipping|store)\b/i],
  ["healthcare", /\b(clinic|patient|appointment|doctor|medical|health|dental)\b/i],
  ["restaurant", /\b(menu|reservation|dine|cuisine|restaurant|takeaway|delivery)\b/i],
  ["realestate", /\b(property|listing|for sale|for rent|realtor|estate|bedroom)\b/i],
  ["education", /\b(course|student|enroll|tuition|school|academy|class)\b/i],
  ["travel", /\b(tour|booking|flight|hotel|destination|travel|safari)\b/i],
  ["finance", /\b(loan|invest|account|banking|insurance|finance|savings)\b/i],
  ["saas", /\b(software|platform|api|dashboard|subscription|integration|saas)\b/i],
];

function guessIndustry(entries: KnowledgeEntry[]): Industry | undefined {
  const text = entries.map((e) => `${e.topic} ${e.content}`).join(" ");
  const scores = new Map<Industry, number>();
  for (const [industry, re] of INDUSTRY_HINTS) {
    const matches = text.match(new RegExp(re.source, "gi"));
    if (matches) scores.set(industry, matches.length);
  }
  let best: Industry | undefined;
  let bestScore = 0;
  for (const [industry, score] of scores) {
    if (score > bestScore) {
      best = industry;
      bestScore = score;
    }
  }
  return best;
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    const body = (await request.json().catch(() => null)) as { url?: string } | null;
    const url = body?.url?.trim();

    if (!url) {
      return NextResponse.json({ error: "url is required" }, { status: 400 });
    }

    const db = getSupabaseAdmin();
    await patchOnboarding(db, session.tenantId, {
      site_url: url,
      crawl: { status: "running", updated_at: new Date().toISOString() },
    });

    // Finish the crawl after the 202 is sent so client navigation can't abort it.
    after(async () => {
      try {
        const result = await crawlSite(url);
        // Grounded FAQ generation is best-effort — [] on any failure. Runs here
        // so both entries and FAQs are ready by the time the user hits step 5.
        const faqs = await generateFaqs(result.entries);
        await patchOnboarding(db, session.tenantId, {
          crawl: {
            status: "done",
            source: result.source,
            entries: result.entries,
            faqs,
            pages_crawled: result.pagesCrawled,
            industry_guess: guessIndustry(result.entries),
            updated_at: new Date().toISOString(),
          },
        });
        await trackEvent(session.tenantId, "crawl_completed", {
          source: result.source,
          pages_crawled: result.pagesCrawled,
          entries: result.entries.length,
          faqs: faqs.length,
        });
      } catch (err) {
        const message =
          err instanceof CrawlError ? err.message : "Crawl failed. You can add your FAQs manually.";
        console.warn(`[API/onboarding/crawl] crawl failed for ${url}:`, message);
        await patchOnboarding(db, session.tenantId, {
          crawl: { status: "failed", error: message, updated_at: new Date().toISOString() },
        }).catch((e) => console.error("[API/onboarding/crawl] failed to persist failure:", e));
      }
    });

    return NextResponse.json({ status: "running" }, { status: 202 });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[API/onboarding/crawl] error:", error);
    return NextResponse.json({ error: "Failed to start crawl" }, { status: 500 });
  }
}
