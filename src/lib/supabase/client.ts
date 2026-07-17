import { createBrowserClient } from "@supabase/ssr";
import { env } from "@/lib/env";

// Browser Supabase client (used by AuthForm and any client component).
export function createClient() {
  return createBrowserClient(env.supabaseUrl, env.supabasePublishableKey);
}
