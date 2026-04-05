import { NextRequest, NextResponse } from "next/server";
import { requireSession, AuthError } from "@/lib/auth/session";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { buildVoiceSystemPrompt } from "@/lib/voice/retell-client";

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    const tenantId = session.tenantId;
    
    const supabase = getSupabaseAdmin();
    
    // Get tenant config
    const { data: tenant } = await supabase
      .from("tenants")
      .select("config")
      .eq("id", tenantId)
      .single();

    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    // Build system prompt
    const systemPrompt = buildVoiceSystemPrompt(tenant.config);
    
    // Get all voice agents for this tenant
    const { data: agents } = await supabase
      .from("voice_agents")
      .select("*")
      .eq("tenant_id", tenantId);

    const results = [];
    
    for (const agent of agents || []) {
      try {
        // Sync this agent
        const syncRes = await fetch(`${process.env.NEXTAUTH_URL}/api/voice/agents`, {
          method: "PATCH",
          headers: { 
            "Content-Type": "application/json",
            "Cookie": request.headers.get("Cookie") || ""
          },
          body: JSON.stringify({ 
            agentId: agent.id, 
            syncPrompt: true 
          }),
        });
        
        const syncData = await syncRes.json();
        results.push({
          agentId: agent.id,
          agentName: agent.name,
          retellAgentId: agent.retell_agent_id,
          success: syncRes.ok,
          response: syncData
        });
      } catch (error) {
        results.push({
          agentId: agent.id,
          agentName: agent.name,
          retellAgentId: agent.retell_agent_id,
          success: false,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    return NextResponse.json({
      tenantId,
      systemPromptLength: systemPrompt.length,
      systemPromptPreview: systemPrompt.slice(0, 300) + "...",
      agentsFound: agents?.length || 0,
      results
    });
    
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[Debug] Sync voice error:", error);
    return NextResponse.json({ 
      error: "Failed to sync voice agents",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
