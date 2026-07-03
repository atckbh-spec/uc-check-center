"use server";

import { revalidatePath } from "next/cache";
import { createAuditLog } from "@/lib/audit/actions";
import { requireRole } from "@/lib/auth/require-staff";
import { isDemoMode } from "@/lib/config/env";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { StaffRole } from "@/lib/types";

const editableRoles: StaffRole[] = ["owner", "admin", "coach", "front_desk"];

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

async function getActiveOwnerCount(supabase: ReturnType<typeof createSupabaseAdminClient>, organizationId: string) {
  const { count, error } = await supabase
    .from("staff_users")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .eq("role", "owner")
    .eq("is_active", true);

  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function createStaffUser(formData: FormData) {
  const actor = await requireRole(["owner", "admin"]);
  const name = String(formData.get("name") || "").trim();
  const email = normalizeEmail(String(formData.get("email") || ""));
  const role = String(formData.get("role") || "coach") as StaffRole;
  const isActive = formData.get("is_active") === "on";

  if (!name) throw new Error("직원 이름을 입력해 주세요.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("직원 이메일을 확인해 주세요.");
  if (!editableRoles.includes(role)) throw new Error("직원 권한을 확인해 주세요.");
  if (role === "owner" && actor.role !== "owner") throw new Error("운영자 권한은 운영자만 생성할 수 있습니다.");

  if (isDemoMode()) {
    revalidatePath("/settings/staff");
    return;
  }

  const supabase = createSupabaseAdminClient();
  const { data: existingStaff, error: existingError } = await supabase
    .from("staff_users")
    .select("id")
    .eq("organization_id", actor.organization_id)
    .eq("email", email)
    .maybeSingle();

  if (existingError) throw new Error(existingError.message);
  if (existingStaff) throw new Error("이미 등록된 직원 이메일입니다.");

  const { data: invited, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(email, {
    data: { name, role }
  });

  if (inviteError) throw new Error(inviteError.message);
  if (!invited.user?.id) throw new Error("초대할 Auth 사용자를 생성하지 못했습니다.");

  const { data: staff, error } = await supabase
    .from("staff_users")
    .insert({
      organization_id: actor.organization_id,
      auth_user_id: invited.user.id,
      name,
      email,
      role,
      is_active: isActive
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  await createAuditLog({
    organizationId: actor.organization_id,
    actorId: actor.id,
    action: "STAFF_CREATED",
    entityType: "staff_users",
    entityId: staff.id,
    afterData: { name, email, role, is_active: isActive }
  });

  revalidatePath("/settings/staff");
}

export async function updateStaffUser(formData: FormData) {
  const actor = await requireRole(["owner", "admin"]);
  const staffId = String(formData.get("staff_id") || "");
  const role = String(formData.get("role") || "") as StaffRole;
  const isActive = formData.get("is_active") === "on";

  if (!staffId) throw new Error("직원을 찾을 수 없습니다.");
  if (!editableRoles.includes(role)) throw new Error("직원 권한을 확인해 주세요.");
  if (staffId === actor.id && role !== actor.role) throw new Error("현재 로그인한 본인의 권한은 직접 변경할 수 없습니다.");
  if (staffId === actor.id && !isActive) throw new Error("현재 로그인한 본인은 비활성화할 수 없습니다.");
  if (role === "owner" && actor.role !== "owner") throw new Error("운영자 권한은 운영자만 지정할 수 있습니다.");

  if (isDemoMode()) {
    revalidatePath("/settings/staff");
    return;
  }

  const supabase = createSupabaseAdminClient();
  const { data: before, error: beforeError } = await supabase
    .from("staff_users")
    .select("*")
    .eq("id", staffId)
    .eq("organization_id", actor.organization_id)
    .single();

  if (beforeError) throw new Error(beforeError.message);
  if (before.role === "owner" && actor.role !== "owner") throw new Error("운영자 권한 변경은 운영자만 할 수 있습니다.");

  if (before.role === "owner" && before.is_active && (role !== "owner" || !isActive)) {
    const activeOwnerCount = await getActiveOwnerCount(supabase, actor.organization_id);
    if (activeOwnerCount <= 1) throw new Error("마지막 활성 운영자는 비활성화하거나 강등할 수 없습니다.");
  }

  const { error } = await supabase
    .from("staff_users")
    .update({ role, is_active: isActive, updated_at: new Date().toISOString() })
    .eq("id", staffId)
    .eq("organization_id", actor.organization_id);

  if (error) throw new Error(error.message);

  await createAuditLog({
    organizationId: actor.organization_id,
    actorId: actor.id,
    action: "STAFF_UPDATED",
    entityType: "staff_users",
    entityId: staffId,
    beforeData: before,
    afterData: { role, is_active: isActive }
  });

  revalidatePath("/settings/staff");
  revalidatePath("/members");
}

export async function assignMemberCoach(memberId: string, formData: FormData) {
  const actor = await requireRole(["owner", "admin"]);
  const assignedCoachId = String(formData.get("assigned_coach_id") || "") || null;

  if (isDemoMode()) {
    revalidatePath(`/members/${memberId}`);
    revalidatePath("/members");
    return;
  }

  const supabase = createSupabaseAdminClient();

  const { data: before, error: beforeError } = await supabase
    .from("members")
    .select("id, assigned_coach_id")
    .eq("id", memberId)
    .eq("organization_id", actor.organization_id)
    .single();

  if (beforeError || !before) throw new Error("현재 조직 소속 회원을 찾을 수 없습니다.");

  if (assignedCoachId) {
    const { data: assignee, error: assigneeError } = await supabase
      .from("staff_users")
      .select("id, role, is_active")
      .eq("id", assignedCoachId)
      .eq("organization_id", actor.organization_id)
      .single();

    if (assigneeError) throw new Error(assigneeError.message);
    if (!assignee?.is_active || !["owner", "admin", "coach"].includes(assignee.role)) {
      throw new Error("담당자로 지정할 수 없는 직원입니다.");
    }
  }

  const { error } = await supabase
    .from("members")
    .update({ assigned_coach_id: assignedCoachId, updated_at: new Date().toISOString() })
    .eq("id", memberId)
    .eq("organization_id", actor.organization_id);

  if (error) throw new Error(error.message);

  await createAuditLog({
    organizationId: actor.organization_id,
    actorId: actor.id,
    action: "MEMBER_COACH_ASSIGNED",
    entityType: "members",
    entityId: memberId,
    beforeData: before,
    afterData: { assigned_coach_id: assignedCoachId }
  });

  revalidatePath(`/members/${memberId}`);
  revalidatePath("/members");
  revalidatePath("/dashboard");
}
