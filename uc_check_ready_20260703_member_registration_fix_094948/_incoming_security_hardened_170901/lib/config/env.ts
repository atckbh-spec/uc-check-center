export function hasSupabaseEnv() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export function hasSupabaseAdminEnv() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export function isDemoMode() {
  return process.env.NEXT_PUBLIC_DEMO_MODE === "true";
}

export function shouldUseDemoData() {
  return isDemoMode();
}

export function assertSupabaseEnv() {
  if (!hasSupabaseEnv() && !isDemoMode()) {
    throw new Error("Supabase environment variables are required. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY, or set NEXT_PUBLIC_DEMO_MODE=true for demo mode.");
  }
}

export function assertSupabaseAdminEnv() {
  if (!hasSupabaseAdminEnv() && !isDemoMode()) {
    throw new Error("Supabase admin environment variables are required. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  }
}
