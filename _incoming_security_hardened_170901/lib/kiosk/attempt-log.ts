import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isDemoMode } from "@/lib/config/env";

export type KioskAttemptResult = "found" | "not_found" | "too_many" | "blocked" | "checked_in" | "pin_failed" | "error";

export async function logKioskAttempt(input: {
  organizationId?: string | null;
  phoneLast4?: string | null;
  result: KioskAttemptResult;
}) {
  if (isDemoMode()) return;

  try {
    const supabase = createSupabaseAdminClient();
    await supabase.from("kiosk_attempt_logs").insert({
      organization_id: input.organizationId ?? null,
      phone_last4: input.phoneLast4 ?? null,
      result: input.result
    });
  } catch {
    // Kiosk logging must never block member check-in.
  }
}
