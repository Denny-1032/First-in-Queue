import { NextRequest, NextResponse } from "next/server";
import { requireSession, AuthError } from "@/lib/auth/session";
import { getTenantById } from "@/lib/db/operations";
import { createAIEngine } from "@/lib/ai/engine";
import { checkRateLimit } from "@/lib/api/rate-limit";
import type { AIContext, BusinessConfig } from "@/types";

/**
 * Test-mode chat for the "Test Your Bot" panel in the AI Config dashboard.
 * Runs the real AI engine against the tenant's config, with the unsaved
 * edits from the form applied on top — no messages are sent to WhatsApp
 * and booking tools are disabled so no real bookings can be created.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();

    const rate = checkRateLimit(`test-chat:${session.tenantId}`, 30, 60_000);
    if (!rate.allowed) {
      return NextResponse.json({ error: "Too many test messages — wait a moment." }, { status: 429 });
    }

    const tenant = await getTenantById(session.tenantId);
    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    if (!tenant.openai_api_key && !process.env.OPENAI_API_KEY) {
      // No key available — client falls back to the local simulator
      return NextResponse.json({ error: "AI not configured" }, { status: 503 });
    }

    const body = await request.json();
    const message: string = typeof body.message === "string" ? body.message.trim() : "";
    if (!message) {
      return NextResponse.json({ error: "Message required" }, { status: 400 });
    }

    const history: Array<{ role: "user" | "assistant"; content: string }> = Array.isArray(body.history)
      ? body.history
          .filter((m: { role?: string; content?: string }) =>
            (m?.role === "user" || m?.role === "assistant") && typeof m?.content === "string")
          .slice(-20)
      : [];

    // Apply unsaved form edits on top of the stored config so the preview
    // reflects exactly what the user is currently configuring
    const overrides = body.overrides || {};
    const config: BusinessConfig = {
      ...tenant.config,
      ...(overrides.personality && { personality: overrides.personality }),
      ...(Array.isArray(overrides.knowledge_base) && { knowledge_base: overrides.knowledge_base }),
      ...(Array.isArray(overrides.faqs) && { faqs: overrides.faqs }),
      ...(typeof overrides.custom_instructions === "string" && { custom_instructions: overrides.custom_instructions }),
      // Never run booking tools from the test panel
      booking_settings: tenant.config.booking_settings
        ? { ...tenant.config.booking_settings, enabled: false }
        : undefined,
    };

    const aiContext: AIContext = {
      tenant_config: config,
      tenant_id: tenant.id,
      conversation_history: [...history, { role: "user", content: message }],
    };

    const engine = createAIEngine(tenant.openai_api_key);
    const aiResponse = await engine.generateResponse(aiContext);

    return NextResponse.json({
      text: aiResponse.text,
      detected_intent: aiResponse.detected_intent,
      should_escalate: aiResponse.should_escalate,
    });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("[API] test-chat error:", error);
    return NextResponse.json({ error: "Failed to generate test response" }, { status: 500 });
  }
}
