import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import {
  createRetellAgent,
  updateRetellAgent,
  deleteRetellAgent,
  buildVoiceSystemPrompt,
} from "@/lib/voice/retell-client";

// =============================================
// Voice Agent Management API
// GET:    List voice agents for a tenant
// POST:   Create a new voice agent
// PATCH:  Update a voice agent
// DELETE: Delete a voice agent
// =============================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get("tenantId");

    if (!tenantId) {
      return NextResponse.json({ error: "tenantId is required" }, { status: 400 });
    }

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
    console.error("[Voice Agents] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      tenantId,
      name,
      voiceId,
      language,
      greeting,
      maxCallDurationSeconds,
      transferPhoneNumber,
    } = body;

    if (!tenantId) {
      return NextResponse.json({ error: "tenantId is required" }, { status: 400 });
    }

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

    const systemPrompt = buildVoiceSystemPrompt(tenant.config);
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
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[Voice Agents] Create error:", msg, error);
    return NextResponse.json({ error: `Failed to create voice agent: ${msg}` }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      agentId,
      tenantId,
      name,
      voiceId,
      language,
      greeting,
      maxCallDurationSeconds,
      transferPhoneNumber,
      isActive,
      syncPrompt,
    } = body;

    if (!agentId || !tenantId) {
      return NextResponse.json({ error: "agentId and tenantId are required" }, { status: 400 });
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
    }
    if (isActive !== undefined) {
      dbUpdates.is_active = isActive;
    }

    // Re-sync system prompt from tenant config if requested
    if (syncPrompt) {
      const { data: tenant } = await supabase
        .from("tenants")
        .select("config")
        .eq("id", tenantId)
        .single();

      if (tenant) {
        const newPrompt = buildVoiceSystemPrompt(tenant.config);
        dbUpdates.system_prompt = newPrompt;
        retellUpdates.systemPrompt = newPrompt;
      }
    }

    // Update Retell agent if there are Retell-side changes
    if (Object.keys(retellUpdates).length > 0) {
      await updateRetellAgent(existing.retell_agent_id, retellUpdates as Parameters<typeof updateRetellAgent>[1]);
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

    return NextResponse.json({ agent: updated });
  } catch (error) {
    console.error("[Voice Agents] Update error:", error);
    return NextResponse.json({ error: "Failed to update voice agent" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get("agentId");
    const tenantId = searchParams.get("tenantId");

    if (!agentId || !tenantId) {
      return NextResponse.json({ error: "agentId and tenantId are required" }, { status: 400 });
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
    console.error("[Voice Agents] Delete error:", error);
    return NextResponse.json({ error: "Failed to delete voice agent" }, { status: 500 });
  }
}
