// Build the kb_entries retrieval index for tenants that already have a knowledge
// base. New saves index themselves; this is for the ones saved before migration
// 025 existed.
//
//   node scripts/backfill-kb-index.mjs            # every tenant with entries
//   node scripts/backfill-kb-index.mjs <tenantId> # just one
//
// Needs NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and OPENAI_API_KEY
// in the environment (.env.local is loaded if present).
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";

// Minimal env loader - this is a one-off script, not worth a dependency.
// .env.local first so it wins, then .env, matching how Next.js resolves them.
for (const name of [".env.local", ".env"]) {
  const envPath = path.join(process.cwd(), name);
  if (!fs.existsSync(envPath)) continue;
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
    }
  }
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const db = createClient(SUPABASE_URL, SERVICE_KEY);
const onlyTenant = process.argv[2];

const hashEntry = (topic, content) =>
  createHash("sha256").update(`${topic}\n${content}`).digest("hex");

const embeddableText = (entry) => {
  const keywords = entry.keywords?.length ? `\nKeywords: ${entry.keywords.join(", ")}` : "";
  return `${entry.topic}\n${entry.content}${keywords}`;
};

let query = db.from("tenants").select("id, name, config, openai_api_key");
if (onlyTenant) query = query.eq("id", onlyTenant);
const { data: tenants, error } = await query;
if (error) {
  console.error("Failed to read tenants:", error.message);
  process.exit(1);
}

for (const tenant of tenants) {
  const entries = (tenant.config?.knowledge_base || []).filter((e) => e.id && e.content?.trim());
  if (entries.length === 0) continue;

  const openai = new OpenAI({ apiKey: tenant.openai_api_key || process.env.OPENAI_API_KEY });
  console.log(`\n${tenant.name || tenant.id}: ${entries.length} entries`);

  const BATCH = 96;
  let indexed = 0;
  for (let i = 0; i < entries.length; i += BATCH) {
    const slice = entries.slice(i, i + BATCH);
    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: slice.map((e) => embeddableText(e).slice(0, 8000)),
    });
    const vectors = response.data
      .slice()
      .sort((a, b) => a.index - b.index)
      .map((d) => d.embedding);

    const rows = slice.map((entry, n) => ({
      tenant_id: tenant.id,
      entry_id: entry.id,
      topic: entry.topic || "",
      content: entry.content,
      content_hash: hashEntry(entry.topic || "", entry.content),
      embedding: JSON.stringify(vectors[n]),
      updated_at: new Date().toISOString(),
    }));

    const { error: upsertError } = await db
      .from("kb_entries")
      .upsert(rows, { onConflict: "tenant_id,entry_id" });
    if (upsertError) {
      console.error(`  upsert failed: ${upsertError.message}`);
      process.exit(1);
    }
    indexed += rows.length;
    console.log(`  indexed ${indexed}/${entries.length}`);
  }
}

console.log("\ndone");
