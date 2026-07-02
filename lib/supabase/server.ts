import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { hasStaffPinSession } from "@/lib/auth/pin-session";
import { assertSupabaseEnv } from "@/lib/config/env";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function createSupabaseServerClient() {
  if (await hasStaffPinSession()) {
    return createSupabaseAdminClient();
  }

  assertSupabaseEnv();
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options: any }>) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Server components cannot write cookies. Server actions can.
          }
        }
      }
    }
  );
}
