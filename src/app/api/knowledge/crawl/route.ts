import { NextRequest, NextResponse } from "next/server";
import { requireSession, AuthError } from "@/lib/auth/session";
import { crawlSite, CrawlError } from "@/lib/knowledge/crawl";

// =============================================
// Web Crawl API for Knowledge Base Population
// POST: Crawl a URL and extract structured knowledge
// ---------------------------------------------
// The crawl logic lives in src/lib/knowledge/crawl.ts so the onboarding wizard
// (§7 step 1) reuses it. This route is now a thin auth + HTTP wrapper.
// =============================================

export async function POST(request: NextRequest) {
  try {
    await requireSession();

    const body = await request.json().catch(() => ({}));
    const result = await crawlSite(body?.url);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof CrawlError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[Crawl] Error:", error);
    return NextResponse.json({ error: "Failed to crawl website" }, { status: 500 });
  }
}
