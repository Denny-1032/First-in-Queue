import { NextRequest, NextResponse } from "next/server";
import { requireSession, AuthError } from "@/lib/auth/session";
import { trackEvent, type FunnelEvent } from "@/lib/analytics/track";

// =============================================
// Client-side funnel events (§10).
// ---------------------------------------------
// Only for events the server cannot observe — currently `snippet_copied`, the
// left-hand side of the drop-off that the verify step exists to close.
//
// Dashboard-authenticated and ALLOW-LISTED: the browser may not name an
// arbitrary event type, and tenant_id always comes from the session, so this is
// not a general-purpose analytics write surface.
// =============================================

const CLIENT_EVENTS: FunnelEvent[] = ["snippet_copied"];

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    const body = (await request.json().catch(() => null)) as {
      event?: string;
      property_id?: string;
    } | null;

    const event = body?.event as FunnelEvent | undefined;
    if (!event || !CLIENT_EVENTS.includes(event)) {
      return NextResponse.json({ error: "Unsupported event" }, { status: 400 });
    }

    await trackEvent(session.tenantId, event, {
      ...(body?.property_id ? { property_id: body.property_id } : {}),
    });

    return NextResponse.json({ tracked: true });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    // Analytics must never surface as a user-visible failure.
    return NextResponse.json({ tracked: false });
  }
}
