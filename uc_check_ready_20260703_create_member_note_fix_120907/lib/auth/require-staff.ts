import { redirect } from "next/navigation";
import { isDemoMode } from "@/lib/config/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { StaffRole, StaffUser } from "@/lib/types";

function demoStaff(): StaffUser {
  return {
    id: "demo-staff",
    organization_id: "demo-organization",
    auth_user_id: "demo-auth-user",
    name: "Demo Admin",
    email: "demo@urban-conditioning.local",
    role: "owner",
    is_active: true
  };
}

export async function getCurrentStaffUser(): Promise<StaffUser | null> {
  if (isDemoMode()) return demoStaff();

  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from("staff_users")
    .select("*")
    .eq("auth_user_id", user.id)
    .eq("is_active", true)
    .single();

  if (error || !data) return null;
  return data as StaffUser;
}

export async function requireStaffUser() {
  const staff = await getCurrentStaffUser();
  if (!staff) redirect("/login");
  return staff;
}

export async function requireRole(roles: StaffRole[]) {
  const staff = await requireStaffUser();
  if (!roles.includes(staff.role)) {
    throw new Error("권한이 없습니다.");
  }
  return staff;
}
