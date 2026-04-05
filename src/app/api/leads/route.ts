import { NextRequest, NextResponse } from "next/server";
import { createOrUpdateLeadScore, getLeads, getHotLeads, getLeadsNeedingFollowUp } from "@/lib/db/operations";
import { requireSession, AuthError } from "@/lib/auth/session";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const session = await requireSession();
    const tenantId = session.tenantId;
    const temperature = searchParams.get("temperature");
    const hot = searchParams.get("hot") === "true";
    const followUp = searchParams.get("follow_up") === "true";
    const converted = searchParams.get("converted");
    const limit = parseInt(searchParams.get("limit") || "50");

    if (hot) {
      const leads = await getHotLeads(tenantId);
      return NextResponse.json(leads);
    }

    if (followUp) {
      const leads = await getLeadsNeedingFollowUp(tenantId);
      return NextResponse.json(leads);
    }

    const leads = await getLeads(
      tenantId,
      {
        temperature: temperature || undefined,
        converted: converted !== null ? converted === "true" : undefined,
      },
      limit
    );
    return NextResponse.json(leads);
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("[API] Error fetching leads:", error);
    return NextResponse.json({ error: "Failed to fetch leads" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const session = await requireSession();
    const tenantId = session.tenantId;

    if (!body.conversation_id || !body.customer_phone) {
      return NextResponse.json(
        { error: "conversation_id and customer_phone are required" },
        { status: 400 }
      );
    }

    const lead = await createOrUpdateLeadScore({
      tenant_id: tenantId,
      conversation_id: body.conversation_id,
      customer_phone: body.customer_phone,
      customer_name: body.customer_name || null,
      score: body.score ?? 0,
      temperature: body.temperature || "cold",
      qualification_data: body.qualification_data || {},
      intent: body.intent || null,
      budget_range: body.budget_range || null,
      timeline: body.timeline || null,
      source: body.source || "whatsapp",
      assigned_agent_id: body.assigned_agent_id || null,
      last_interaction_at: new Date().toISOString(),
      next_follow_up_at: body.next_follow_up_at || null,
      follow_up_count: body.follow_up_count ?? 0,
      converted: body.converted ?? false,
      converted_at: body.converted_at || null,
    });

    return NextResponse.json(lead, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("[API] Error creating/updating lead:", error);
    return NextResponse.json({ error: "Failed to create/update lead" }, { status: 500 });
  }
}
