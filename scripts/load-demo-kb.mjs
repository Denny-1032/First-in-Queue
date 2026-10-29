// Load a curated knowledge base (and optionally a config patch) into one tenant.
//
//   node scripts/load-demo-kb.mjs <tenantId> <kb.json> [config.json] [--dry-run]
//   node scripts/backfill-kb-index.mjs <tenantId>   # then rebuild retrieval index
//
// The knowledge base REPLACES the tenant's existing entries - a demo tenant
// starts life with the signup template's entries (order tracking, returns), and
// leaving those beside a regulator's fee schedule is how an assistant ends up
// offering a teacher a free return label. Keys in config.json overwrite the same
// keys in tenant.config; every other key is left alone.
//
// The tenant's current config is written to the OS temp dir before anything is
// changed, so a bad load can be put back by hand.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

for (const name of [".env.local", ".env"]) {
  const envPath = path.join(process.cwd(), name);
  if (!fs.existsSync(envPath)) continue;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
    }
  }
}

const args = process.argv.slice(2);
const DRY = args.includes("--dry-run");
const [tenantId, kbFile, configFile] = args.filter((a) => !a.startsWith("--"));
if (!tenantId || !kbFile) {
  console.error("usage: load-demo-kb.mjs <tenantId> <kb.json> [config.json] [--dry-run]");
  process.exit(1);
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

// Stable ids from the file name and position, so a re-run keeps the same ids and
// the retrieval index only re-embeds entries whose text actually changed.
const prefix = path.basename(kbFile, ".json").replace(/[^a-z0-9]+/gi, "_");
const entries = JSON.parse(fs.readFileSync(kbFile, "utf8")).map((e, i) => {
  if (!e.topic?.trim() || !e.content?.trim()) throw new Error(`entry ${i} has no topic or content`);
  return {
    id: e.id || `${prefix}_${String(i + 1).padStart(3, "0")}`,
    topic: e.topic.trim().slice(0, 150),
    content: e.content.trim(),
    keywords: (e.keywords || []).slice(0, 12),
  };
});
const patch = configFile ? JSON.parse(fs.readFileSync(configFile, "utf8")) : {};
delete patch.knowledge_base; // the KB comes from kbFile only

const db = createClient(SUPABASE_URL, SERVICE_KEY);
const { data: tenant, error } = await db.from("tenants").select("id, name, config").eq("id", tenantId).single();
if (error || !tenant) {
  console.error("Tenant not found:", error?.message || tenantId);
  process.exit(1);
}

const before = tenant.config || {};
const next = { ...before, ...patch, knowledge_base: entries };
const chars = entries.reduce((n, e) => n + e.content.length, 0);

console.log(`${tenant.name} (${tenant.id})`);
console.log(`  knowledge base: ${(before.knowledge_base || []).length} -> ${entries.length} entries (${chars} chars)`);
for (const key of Object.keys(patch)) console.log(`  config.${key}: replaced`);

if (DRY) {
  console.log("\n--dry-run: nothing written");
  process.exit(0);
}

const backup = path.join(os.tmpdir(), `tenant-config-${tenant.id}-${Date.now()}.json`);
fs.writeFileSync(backup, JSON.stringify(before, null, 2));
console.log(`  previous config saved to ${backup}`);

const { error: writeError } = await db
  .from("tenants")
  .update({ config: next, updated_at: new Date().toISOString() })
  .eq("id", tenant.id);
if (writeError) {
  console.error("Write failed:", writeError.message);
  process.exit(1);
}
console.log(`\nWritten. Now rebuild the retrieval index:\n  node scripts/backfill-kb-index.mjs ${tenant.id}`);
