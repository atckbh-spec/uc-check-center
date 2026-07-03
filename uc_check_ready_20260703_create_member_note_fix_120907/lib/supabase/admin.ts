import "server-only";
import { createClient } from "@supabase/supabase-js";
import { assertSupabaseAdminEnv } from "@/lib/config/env";

export function createSupabaseAdminClient() {
  assertSupabaseAdminEnv();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRole) {
    throw new Error("Supabase admin credentials are missing.");
  }

  return createClient(url, serviceRole, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}
