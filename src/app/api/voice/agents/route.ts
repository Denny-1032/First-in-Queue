import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import {
  createRetellAgent,
  updateRetellAgent,
  deleteRetellAgent,
  buildVoiceSystemPrompt,
  syncKnowledgeBaseToRetell,
} from "@/lib/voice/retell-client";
import { requireSession, AuthError } from "@/lib/auth/session";

// =============================================
// Voice Agent Management API
// GET:    List voice agents for a tenant
// POST:   Create a new voice agent
// PATCH:  Update a voice agent
// DELETE: Delete a voice agent
// =============================================

export async function GET(request: NextRequest) {
  try {
    const session = await requireSession();
    const tenantId = session.tenantId;

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("voice_agents")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: "Failed to fetch voice agents" }, { status: 500 });
    }

    return NextResponse.json({ agents: data || [] });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("[Voice Agents] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    const tenantId = session.tenantId;
    const body = await request.json();
    const {
      name,
      voiceId,
      language,
      greeting,
      maxCallDurationSeconds,
      transferPhoneNumber,
    } = body;

    const supabase = getSupabaseAdmin();

    // Fetch tenant config to build system prompt
    const { data: tenant } = await supabase
      .from("tenants")
      .select("config")
      .eq("id", tenantId)
      .single();

    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const systemPrompt = buildVoiceSystemPrompt(tenant.config, transferPhoneNumber || null);
    const agentName = name || `${tenant.config.business_name} Voice Agent`;

    // Create agent in Retell AI
    const retellAgent = await createRetellAgent({
      name: agentName,
      systemPrompt,
      voiceId: voiceId || undefined,
      language: language || tenant.config.default_language || "en",
      greeting: greeting || `Hello, thank you for calling ${tenant.config.business_name}. How can I help you today?`,
      maxDurationSeconds: maxCallDurationSeconds || 600,
      transferNumber: transferPhoneNumber || undefined,
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const retellAgentId = (retellAgent as any).agent_id as string;

    // Save to database
    const { data: agent, error } = await supabase
      .from("voice_agents")
      .insert({
        tenant_id: tenantId,
        retell_agent_id: retellAgentId,
        name: agentName,
        voice_id: voiceId || null,
        greeting_message: greeting || `Hello, thank you for calling ${tenant.config.business_name}. How can I help you today?`,
        system_prompt: systemPrompt,
        language: language || tenant.config.default_language || "en",
        max_call_duration_seconds: maxCallDurationSeconds || 600,
        transfer_phone_number: transferPhoneNumber || null,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      // Rollback: delete from Retell if DB insert failed
      try {
        await deleteRetellAgent(retellAgentId);
      } catch (_) {
        /* best effort cleanup */
      }
      console.error("[Voice Agents] DB insert error:", error);
      return NextResponse.json({ error: "Failed to save voice agent" }, { status: 500 });
    }

    return NextResponse.json({ agent }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[Voice Agents] Create error:", msg, error);
    return NextResponse.json({ error: `Failed to create voice agent: ${msg}` }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await requireSession();
    const tenantId = session.tenantId;
    const body = await request.json();
    const {
      agentId,
      name,
      voiceId,
      language,
      greeting,
      maxCallDurationSeconds,
      transferPhoneNumber,
      isActive,
      syncPrompt,
    } = body;

    if (!agentId) {
      return NextResponse.json({ error: "agentId is required" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // Get existing agent
    const { data: existing } = await supabase
      .from("voice_agents")
      .select("*")
      .eq("id", agentId)
      .eq("tenant_id", tenantId)
      .single();

    if (!existing) {
      return NextResponse.json({ error: "Voice agent not found" }, { status: 404 });
    }

    // Build update payload
    const dbUpdates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    const retellUpdates: Record<string, unknown> = {};
    const warnings: string[] = []; // Track non-fatal errors

    if (name) {
      dbUpdates.name = name;
      retellUpdates.name = name;
    }
    if (voiceId) {
      dbUpdates.voice_id = voiceId;
      retellUpdates.voiceId = voiceId;
    }
    if (language) {
      dbUpdates.language = language;
      retellUpdates.language = language;
    }
    if (greeting) {
      dbUpdates.greeting_message = greeting;
      retellUpdates.greeting = greeting;
    }
    if (maxCallDurationSeconds) {
      dbUpdates.max_call_duration_seconds = maxCallDurationSeconds;
      retellUpdates.maxDurationSeconds = maxCallDurationSeconds;
    }
    if (transferPhoneNumber !== undefined) {
      dbUpdates.transfer_phone_number = transferPhoneNumber || null;
      retellUpdates.transferNumber = transferPhoneNumber || null;
    }
    if (isActive !== undefined) {
      dbUpdates.is_active = isActive;
    }

    // Re-sync system prompt AND knowledge base from tenant config if requested
    if (syncPrompt) {
      console.log(`[Voice Agents] Syncing prompt + KB for agent ${agentId}`);
      const { data: tenant } = await supabase
        .from("tenants")
        .select("config, name")
        .eq("id", tenantId)
        .single();

      if (tenant) {
        // 1. Update system prompt on the Retell agent
        const currentTransferNumber = transferPhoneNumber ?? existing.transfer_phone_number ?? null;
        const newPrompt = buildVoiceSystemPrompt(tenant.config, currentTransferNumber);
        console.log(`[Voice Agents] Built new prompt (${newPrompt.length} chars)`);
        dbUpdates.system_prompt = newPrompt;
        retellUpdates.systemPrompt = newPrompt;

        // 2. Sync Knowledge Base to Retell (create KB + attach to LLM)
        try {
          const existingKbId = existing.retell_kb_id || null;
          console.log(`[Voice Agents] Starting KB sync. Existing KB: ${existingKbId || 'none'}`);
          console.log(`[Voice Agents] Tenant config has ${tenant.config.knowledge_base?.length || 0} KB entries, ${tenant.config.faqs?.length || 0} FAQs`);
          
          const kbResult = await syncKnowledgeBaseToRetell({
            config: tenant.config,
            tenantName: tenant.name || tenant.config.business_name || "FiQ Business",
            existingKbId,
          });
          dbUpdates.retell_kb_id = kbResult.knowledgeBaseId;
          console.log(`[Voice Agents] KB synced successfully: ${kbResult.knowledgeBaseId}`);
        } catch (kbError) {
          // Log error but don't fail the save — KB sync is not critical for chat functionality
          const errorMsg = kbError instanceof Error ? kbError.message : String(kbError);
          console.error(`[Voice Agents] KB sync FAILED (non-fatal):`, kbError);
          
          // Store warning but continue with save
          warnings.push(`Voice agent "${existing.name}": Knowledge base sync failed — ${errorMsg.includes("RETELL_LLM_ID") ? "RETELL_LLM_ID not configured" : errorMsg.includes("RETELL_API_KEY") ? "RETELL_API_KEY not configured" : "check server logs"}`);
        }
      } else {
        console.warn(`[Voice Agents] No tenant config found for ID ${tenantId}`);
      }
    }

    // Update Retell agent if there are Retell-side changes
    if (Object.keys(retellUpdates).length > 0) {
      console.log(`[Voice Agents] Updating Retell agent ${existing.retell_agent_id} with:`, Object.keys(retellUpdates));
      try {
        const retellResponse = await updateRetellAgent(existing.retell_agent_id, retellUpdates as Parameters<typeof updateRetellAgent>[1]);
        console.log(`[Voice Agents] Retell update successful:`, retellResponse);
      } catch (retellError) {
        console.error(`[Voice Agents] Retell update failed:`, retellError);
        // Check if it's a configuration error
        if (retellError instanceof Error && retellError.message.includes("RETELL_API_KEY")) {
          return NextResponse.json({ 
            error: "Retell API not configured. Please check RETELL_API_KEY environment variable." 
          }, { status: 500 });
        }
        if (retellError instanceof Error && retellError.message.includes("RETELL_LLM_ID")) {
          return NextResponse.json({ 
            error: "Retell LLM not configured. Please check RETELL_LLM_ID environment variable." 
          }, { status: 500 });
        }
        // Return the actual Retell error to help with debugging
        return NextResponse.json({ 
          error: "Failed to update Retell agent", 
          details: retellError instanceof Error ? retellError.message : String(retellError)
        }, { status: 500 });
      }
    }

    // Update database
    const { data: updated, error } = await supabase
      .from("voice_agents")
      .update(dbUpdates)
      .eq("id", agentId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: "Failed to update voice agent" }, { status: 500 });
    }

    return NextResponse.json({ 
      agent: updated,
      ...(warnings.length > 0 && { warnings })
    });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("[Voice Agents] Update error:", error);
    return NextResponse.json({ error: "Failed to update voice agent" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await requireSession();
    const tenantId = session.tenantId;
    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get("agentId");

    if (!agentId) {
      return NextResponse.json({ error: "agentId is required" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    const { data: existing } = await supabase
      .from("voice_agents")
      .select("retell_agent_id")
      .eq("id", agentId)
      .eq("tenant_id", tenantId)
      .single();

    if (!existing) {
      return NextResponse.json({ error: "Voice agent not found" }, { status: 404 });
    }

    // Delete from Retell
    try {
      await deleteRetellAgent(existing.retell_agent_id);
    } catch (err) {
      console.warn("[Voice Agents] Failed to delete from Retell:", err);
    }

    // Delete from database
    await supabase.from("voice_agents").delete().eq("id", agentId);

    return NextResponse.json({ deleted: true });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("[Voice Agents] Delete error:", error);
    return NextResponse.json({ error: "Failed to delete voice agent" }, { status: 500 });
  }
}
