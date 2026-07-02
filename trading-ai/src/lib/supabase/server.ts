import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let adminClient: SupabaseClient | null | undefined;

export function getSupabaseAdmin(): SupabaseClient | null {
  if (adminClient !== undefined) return adminClient;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    adminClient = null;
    return null;
  }
  adminClient = createClient(url, key, { auth: { persistSession: false } });
  return adminClient;
}

export function isSupabaseConfigured(): boolean {
  return getSupabaseAdmin() !== null;
}
