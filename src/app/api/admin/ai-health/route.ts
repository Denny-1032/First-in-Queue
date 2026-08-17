import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { describeAIError } from "@/lib/ai/engine";
import { getTenantById } from "@/lib/db/operations";

// One cheap round-trip to OpenAI with the credentials the engine would actually
// use, so "why is the widget saying it has a technical issue?" is one request
// instead of a guess. The engine swallows its own failures by design - a
// customer must never see a stack trace - which is exactly why this exists.
//
// Admin-only: /api/admin/* is gated by the signed admin cookie in proxy.ts.
//
// Pass ?tenant_id=… to test a tenant's own stored key. Without it, the shared
// environment key is tested - which is what any tenant whose openai_api_key is
// blank falls back to.

export async function GET(request: NextRequest) {
  const tenantId = request.nextUrl.searchParams.get("tenant_id");

  let apiKey = process.env.OPENAI_API_KEY;
  let keySource: "tenant" | "env" = "env";

  if (tenantId) {
    const tenant = await getTenantById(tenantId);
    if (!tenant) {
      return NextResponse.json({ ok: false, error: "Tenant not found" }, { status: 404 });
    }
    if (tenant.openai_api_key) {
      apiKey = tenant.openai_api_key;
      keySource = "tenant";
    }
  }

  const model = process.env.OPENAI_MODEL || "gpt-4o";

  if (!apiKey) {
    return NextResponse.json({
      ok: false,
      model,
      keySource,
      // Never echo the key itself, only whether one is present at all.
      error: "No API key configured (tenants.openai_api_key is empty and OPENAI_API_KEY is unset)",
    });
  }

  const started = Date.now();
  try {
    const completion = await new OpenAI({ apiKey }).chat.completions.create({
      model,
      messages: [{ role: "user", content: "ping" }],
      max_tokens: 5,
    });
    return NextResponse.json({
      ok: true,
      model,
      keySource,
      ms: Date.now() - started,
      finish_reason: completion.choices[0]?.finish_reason ?? null,
    });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      model,
      keySource,
      ms: Date.now() - started,
      error: describeAIError(error),
    });
  }
}
