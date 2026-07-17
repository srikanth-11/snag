// Central env access. Guards let the app boot and render before the operator
// has pasted real keys — auth/agent features degrade gracefully instead of
// crashing every request.

export const env = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  // Supabase's new "publishable" key (falls back to the legacy "anon" name).
  supabasePublishableKey:
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    "",
  // Supabase's new "secret" key (falls back to the legacy "service_role" name).
  supabaseSecretKey:
    process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  geminiKey: process.env.GEMINI_API_KEY ?? "",
  nvidiaKey: process.env.NVIDIA_API_KEY ?? "",
  groqKey: process.env.GROQ_API_KEY ?? "",
};

export const hasSupabase = Boolean(env.supabaseUrl && env.supabasePublishableKey);
export const hasAnyLlm = Boolean(env.geminiKey || env.nvidiaKey || env.groqKey);
