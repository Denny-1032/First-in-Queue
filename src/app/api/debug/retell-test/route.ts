import { NextRequest, NextResponse } from "next/server";
import { requireSession, AuthError } from "@/lib/auth/session";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { getRetellAgent, updateRetellAgent } from "@/lib/voice/retell-client";

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    const tenantId = session.tenantId;
    
    const supabase = getSupabaseAdmin();
    
    // Get first voice agent for this tenant
    const { data: agents } = await supabase
      .from("voice_agents")
      .select("*")
      .eq("tenant_id", tenantId)
      .limit(1);

    if (!agents || agents.length === 0) {
      return NextResponse.json({ error: "No voice agents found" }, { status: 404 });
    }

    const agent = agents[0];
    
    try {
      // Test 1: Retrieve agent from Retell
      console.log(`[Debug] Retrieving Retell agent ${agent.retell_agent_id}`);
      const retellAgent = await getRetellAgent(agent.retell_agent_id);
      
      // Test 2: Try a simple update (just updating the name to the same value)
      console.log(`[Debug] Testing update of Retell agent ${agent.retell_agent_id}`);
      const updateResult = await updateRetellAgent(agent.retell_agent_id, {
        name: agent.name,
        systemPrompt: "This is a test system prompt to verify the Retell API connection is working properly."
      });
      
      return NextResponse.json({
        success: true,
        agentId: agent.id,
        retellAgentId: agent.retell_agent_id,
        agentName: agent.name,
        retellAgentData: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          name: (retellAgent as any)?.agent_name,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          currentPrompt: (retellAgent as any)?.general_prompt?.slice(0, 200) + "...",
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          promptLength: (retellAgent as any)?.general_prompt?.length || 0
        },
        updateResult: "Success"
      });
      
    } catch (retellError) {
      console.error("[Debug] Retell API error:", retellError);
      return NextResponse.json({
        success: false,
        agentId: agent.id,
        retellAgentId: agent.retell_agent_id,
        error: retellError instanceof Error ? retellError.message : String(retellError),
        errorDetails: retellError
      });
    }
    
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[Debug] Test error:", error);
    return NextResponse.json({ 
      error: "Failed to test Retell connection",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
