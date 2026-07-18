import { createBrowserClient } from "@supabase/ssr";
import { env } from "@/lib/env";

// Browser Supabase client (used by AuthForm and any client component).
export function createClient() {
  // Placeholders keep the build/SSR from throwing before real keys are set;
  // hasSupabase gates actual use, so nothing calls this with placeholders live.
  return createBrowserClient(
    env.supabaseUrl || "https://placeholder.supabase.co",
    env.supabasePublishableKey || "placeholder",
  );
}
