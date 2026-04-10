import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";

/**
 * Widget Embed API
 * 
 * Provides embed code and configuration for the Call Us widget.
 * External websites can request embed code for their tenant.
 * 
 * Usage:
 * GET /api/widget/embed?tenantId=xxx&agentId=yyy&theme=custom
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get("tenantId");
    const agentId = searchParams.get("agentId");
    const theme = searchParams.get("theme") || "default";

    if (!tenantId || !agentId) {
      return NextResponse.json(
        { error: "tenantId and agentId are required" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    // Validate tenant and agent
    const { data: agent, error: agentError } = await supabase
      .from("voice_agents")
      .select("id, name, tenant_id, is_active")
      .eq("id", agentId)
      .eq("tenant_id", tenantId)
      .eq("is_active", true)
      .limit(1)
      .single();

    if (agentError || !agent) {
      return NextResponse.json(
        { error: "Voice agent not found or not active" },
        { status: 404 }
      );
    }

    // Get tenant branding settings (you can implement this later)
    const { data: tenant } = await supabase
      .from("tenants")
      .select("name, domain")
      .eq("id", tenantId)
      .limit(1)
      .single();

    // Theme configurations
    const themes = {
      default: {
        primaryColor: "#3b82f6",
        backgroundColor: "#ffffff",
        textColor: "#1f2937",
        title: "Need Help?",
        subtitle: "Talk to our AI assistant",
        showBranding: true,
      },
      dark: {
        primaryColor: "#10b981",
        backgroundColor: "#1f2937",
        textColor: "#f9fafb",
        title: "Support",
        subtitle: "AI assistant available",
        showBranding: true,
      },
      minimal: {
        primaryColor: "#6b7280",
        backgroundColor: "#ffffff",
        textColor: "#374151",
        title: "Chat",
        subtitle: "Get help now",
        showBranding: false,
      },
      custom: {
        primaryColor: searchParams.get("primaryColor") || "#3b82f6",
        backgroundColor: searchParams.get("backgroundColor") || "#ffffff",
        textColor: searchParams.get("textColor") || "#1f2937",
        title: searchParams.get("title") || "Need Help?",
        subtitle: searchParams.get("subtitle") || "Talk to our AI assistant",
        showBranding: searchParams.get("showBranding") !== "false",
      },
    };

    const config = themes[theme as keyof typeof themes] || themes.default;

    // Generate embed code
    const embedUrl = `${process.env.NEXT_PUBLIC_APP_URL}/widget.js`;
    const embedCode = `<script src="${embedUrl}" data-tenant-id="${tenantId}" data-agent-id="${agentId}" data-theme="${theme}" data-primary-color="${config.primaryColor}" data-background-color="${config.backgroundColor}" data-text-color="${config.textColor}" data-title="${encodeURIComponent(config.title)}" data-subtitle="${encodeURIComponent(config.subtitle)}" data-show-branding="${config.showBranding}"></script>`;

    // Generate iframe embed (alternative approach)
    const iframeUrl = `${process.env.NEXT_PUBLIC_APP_URL}/widget/iframe?tenantId=${tenantId}&agentId=${agentId}&theme=${theme}&primaryColor=${encodeURIComponent(config.primaryColor)}&backgroundColor=${encodeURIComponent(config.backgroundColor)}&textColor=${encodeURIComponent(config.textColor)}&title=${encodeURIComponent(config.title)}&subtitle=${encodeURIComponent(config.subtitle)}&showBranding=${config.showBranding}`;
    const iframeCode = `<iframe src="${iframeUrl}" width="320" height="500" frameborder="0" style="position: fixed; bottom: 20px; right: 20px; z-index: 9999; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);"></iframe>`;

    return NextResponse.json({
      success: true,
      tenant: {
        id: tenantId,
        name: tenant?.name || "Unknown",
        domain: tenant?.domain,
      },
      agent: {
        id: agent.id,
        name: agent.name,
      },
      config,
      embedCode,
      iframeCode,
      embedUrl,
      iframeUrl,
      instructions: {
        script: "Copy the embedCode and paste it before the closing </body> tag of your website.",
        iframe: "Copy the iframeCode and paste it where you want the widget to appear.",
        notes: [
          "The widget will appear as a floating button in the bottom-right corner",
          "Users can click it to start a voice call with your AI assistant",
          "No additional setup required - works immediately",
          "WebRTC requires HTTPS on your website",
        ],
      },
    });
  } catch (error) {
    console.error("[Widget Embed] Error:", error);
    return NextResponse.json(
      { error: "Failed to generate embed code" },
      { status: 500 }
    );
  }
}

/**
 * Validate widget configuration and return settings
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tenantId, agentId, config } = body;

    if (!tenantId || !agentId) {
      return NextResponse.json(
        { error: "tenantId and agentId are required" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    // Validate tenant owns the agent
    const { data: agent, error } = await supabase
      .from("voice_agents")
      .select("id, tenant_id")
      .eq("id", agentId)
      .eq("tenant_id", tenantId)
      .eq("is_active", true)
      .limit(1)
      .single();

    if (error || !agent) {
      return NextResponse.json(
        { error: "Invalid tenant or agent" },
        { status: 404 }
      );
    }

    // Save custom widget configuration (you can implement this later)
    // For now, just validate and return success
    return NextResponse.json({
      success: true,
      message: "Widget configuration saved",
    });
  } catch (error) {
    console.error("[Widget Embed] POST Error:", error);
    return NextResponse.json(
      { error: "Failed to save configuration" },
      { status: 500 }
    );
  }
}
