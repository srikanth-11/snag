import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

let cached: SupabaseClient | null = null;

// Admin client (Supabase "secret" key) for server-side writes. Bypasses RLS —
// never import into client components.
export function adminClient(): SupabaseClient {
  if (!cached) {
    cached = createClient(env.supabaseUrl, env.supabaseSecretKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return cached;
}
