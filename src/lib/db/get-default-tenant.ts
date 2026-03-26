import { getSupabaseAdmin } from "@/lib/supabase/server";

let _cachedTenantId: string | null = null;

export async function getDefaultTenantId(): Promise<string> {
  // If env var is set and looks like a UUID, use it directly
  const envId = process.env.DEFAULT_TENANT_ID;
  if (envId && envId.length > 10) return envId;

  // Use cached value
  if (_cachedTenantId) return _cachedTenantId;

  // Auto-discover first active tenant
  const { data } = await getSupabaseAdmin()
    .from("tenants")
    .select("id")
    .eq("is_active", true)
    .order("created_at", { ascending: true })
    .limit(1)
    .single();

  if (data?.id) {
    _cachedTenantId = data.id;
    return data.id;
  }

  return "default";
}
