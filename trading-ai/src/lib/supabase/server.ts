import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let adminClient: SupabaseClient | null | undefined;

function readSupabaseConfig(): { url?: string; key?: string } {
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL,
    key: process.env.SUPABASE_SERVICE_ROLE_KEY,
  };
}

function isValidSupabaseUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && parsed.hostname.endsWith(".supabase.co");
  } catch {
    return false;
  }
}

export function getSupabaseAdmin(): SupabaseClient | null {
  if (adminClient !== undefined) return adminClient;

  const { url, key } = readSupabaseConfig();
  if (!url || !key || !isValidSupabaseUrl(url)) {
    adminClient = null;
    return null;
  }

  try {
    adminClient = createClient(url, key, { auth: { persistSession: false } });
    return adminClient;
  } catch {
    adminClient = null;
    return null;
  }
}

export function isSupabaseConfigured(): boolean {
  const { url, key } = readSupabaseConfig();
  return Boolean(url && key && isValidSupabaseUrl(url));
}
