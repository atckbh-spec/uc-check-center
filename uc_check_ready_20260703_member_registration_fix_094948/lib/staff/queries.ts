import { shouldUseDemoData } from "@/lib/config/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { StaffUser } from "@/lib/types";

export type StaffUserWithLoad = StaffUser & {
  assignedMemberCount: number;
};

export const demoStaffUsers: StaffUserWithLoad[] = [
  {
    id: "demo-staff",
    organization_id: "demo-organization",
    auth_user_id: "demo-auth-user",
    name: "관리자",
    email: "demo@urban-conditioning.local",
    role: "owner",
    is_active: true,
    assignedMemberCount: 4
  },
  {
    id: "demo-coach-1",
    organization_id: "demo-organization",
    auth_user_id: "demo-coach-auth-1",
    name: "이코치",
    email: "coach@urban-conditioning.local",
    role: "coach",
    is_active: true,
    assignedMemberCount: 18
  },
  {
    id: "demo-front-1",
    organization_id: "demo-organization",
    auth_user_id: "demo-front-auth-1",
    name: "프론트",
    email: "front@urban-conditioning.local",
    role: "front_desk",
    is_active: true,
    assignedMemberCount: 0
  }
];

export async function getStaffUsers(organizationId: string): Promise<StaffUserWithLoad[]> {
  if (shouldUseDemoData()) return demoStaffUsers;

  const supabase = await createSupabaseServerClient();
  const [{ data: staffUsers, error: staffError }, { data: members, error: memberError }] = await Promise.all([
    supabase
      .from("staff_users")
      .select("*")
      .eq("organization_id", organizationId)
      .order("is_active", { ascending: false })
      .order("role", { ascending: true })
      .order("name", { ascending: true }),
    supabase
      .from("members")
      .select("assigned_coach_id")
      .eq("organization_id", organizationId)
      .neq("status", "archived")
  ]);

  if (staffError) throw new Error(staffError.message);
  if (memberError) throw new Error(memberError.message);

  const loadByStaff = (members ?? []).reduce<Record<string, number>>((acc, member: any) => {
    if (member.assigned_coach_id) acc[member.assigned_coach_id] = (acc[member.assigned_coach_id] ?? 0) + 1;
    return acc;
  }, {});

  return ((staffUsers ?? []) as StaffUser[]).map((staff) => ({
    ...staff,
    assignedMemberCount: loadByStaff[staff.id] ?? 0
  }));
}

export function getAssignableStaff(staffUsers: StaffUser[]) {
  return staffUsers.filter((staff) => staff.is_active && ["owner", "admin", "coach"].includes(staff.role));
}
