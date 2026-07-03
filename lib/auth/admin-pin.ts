import "server-only";

import crypto from "crypto";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isAdminPin, setStaffPinSession } from "@/lib/auth/pin-session";
import type { StaffUser } from "@/lib/types";

type AdminPinSessionResult =
  | { ok: true; staff: StaffUser }
  | { ok: false; reason: "pin" | "no_staff" };

function sortStaffByAdminPriority(staffUsers: StaffUser[]) {
  return staffUsers.sort((a, b) => {
    const priority = { owner: 0, admin: 1, coach: 2, front_desk: 3 };
    return priority[a.role] - priority[b.role] || a.name.localeCompare(b.name);
  });
}

async function findOrCreateOrganization(supabase: ReturnType<typeof createSupabaseAdminClient>) {
  const { data: existing, error: existingError } = await supabase
    .from("organizations")
    .select("id, name, slug")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (existingError) throw new Error(existingError.message);
  if (existing) return existing;

  const { data, error } = await supabase
    .from("organizations")
    .insert({
      name: "Urban Conditioning",
      slug: "urban-conditioning"
    })
    .select("id, name, slug")
    .single();

  if (error) throw new Error(error.message);
  return data;
}

async function findAuthUserIdByEmail(supabase: ReturnType<typeof createSupabaseAdminClient>, email: string) {
  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error(error.message);

    const user = data.users.find((item) => item.email?.toLowerCase() === email.toLowerCase());
    if (user) return user.id;
    if (data.users.length < 1000) return null;
  }

  return null;
}

async function findOrCreatePinAdminStaff(supabase: ReturnType<typeof createSupabaseAdminClient>): Promise<StaffUser | null> {
  const organization = await findOrCreateOrganization(supabase);
  const email = `pin-admin-${organization.id}@uc-check.local`;
  let authUserId = await findAuthUserIdByEmail(supabase, email);

  if (!authUserId) {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password: crypto.randomBytes(24).toString("base64url"),
      email_confirm: true,
      user_metadata: {
        name: "PIN 관리자",
        source: "admin_pin_bootstrap"
      }
    });

    if (error) throw new Error(error.message);
    authUserId = data.user?.id ?? null;
  }

  if (!authUserId) return null;

  const { data: existingStaff, error: existingStaffError } = await supabase
    .from("staff_users")
    .select("*")
    .eq("auth_user_id", authUserId)
    .maybeSingle();

  if (existingStaffError) throw new Error(existingStaffError.message);
  if (existingStaff) {
    if (existingStaff.is_active && ["owner", "admin"].includes(existingStaff.role)) return existingStaff as StaffUser;

    const { data: updatedStaff, error: updateError } = await supabase
      .from("staff_users")
      .update({ role: "owner", is_active: true, name: "PIN 관리자", email })
      .eq("id", existingStaff.id)
      .select("*")
      .single();

    if (updateError) throw new Error(updateError.message);
    return updatedStaff as StaffUser;
  }

  const { data: staff, error: staffError } = await supabase
    .from("staff_users")
    .insert({
      organization_id: organization.id,
      auth_user_id: authUserId,
      name: "PIN 관리자",
      email,
      role: "owner",
      is_active: true
    })
    .select("*")
    .single();

  if (staffError) throw new Error(staffError.message);
  return staff as StaffUser;
}

export async function createAdminPinSession(pin: string): Promise<AdminPinSessionResult> {
  if (!isAdminPin(pin)) return { ok: false, reason: "pin" };

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("staff_users")
    .select("*")
    .eq("is_active", true)
    .in("role", ["owner", "admin"]);

  if (error) throw new Error(error.message);

  const staff = sortStaffByAdminPriority((data ?? []) as StaffUser[])[0] ?? (await findOrCreatePinAdminStaff(supabase));

  if (!staff) return { ok: false, reason: "no_staff" };

  await setStaffPinSession(staff.id);
  return { ok: true, staff };
}
