import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isAdminPin, setStaffPinSession } from "@/lib/auth/pin-session";
import type { StaffUser } from "@/lib/types";

type AdminPinSessionResult =
  | { ok: true; staff: StaffUser }
  | { ok: false; reason: "pin" | "no_staff" };

export async function createAdminPinSession(pin: string): Promise<AdminPinSessionResult> {
  if (!isAdminPin(pin)) return { ok: false, reason: "pin" };

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("staff_users")
    .select("*")
    .eq("is_active", true)
    .in("role", ["owner", "admin"]);

  if (error) throw new Error(error.message);

  const staff = ((data ?? []) as StaffUser[]).sort((a, b) => {
    const priority = { owner: 0, admin: 1, coach: 2, front_desk: 3 };
    return priority[a.role] - priority[b.role] || a.name.localeCompare(b.name);
  })[0];

  if (!staff) return { ok: false, reason: "no_staff" };

  await setStaffPinSession(staff.id);
  return { ok: true, staff };
}
