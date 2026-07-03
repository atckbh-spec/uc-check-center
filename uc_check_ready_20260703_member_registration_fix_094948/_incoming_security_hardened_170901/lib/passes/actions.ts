"use server";

import { revalidatePath } from "next/cache";
import { createAuditLog } from "@/lib/audit/actions";
import { requireRole } from "@/lib/auth/require-staff";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { todayInKorea } from "@/lib/utils/format-date";

export async function createMemberPass(memberId: string, formData: FormData) {
  const staff = await requireRole(["owner", "admin", "front_desk"]);
  const supabase = await createSupabaseServerClient();
  const totalSessions = Number(formData.get("total_sessions") || 0);
  const startDate = String(formData.get("start_date") || todayInKorea());
  const passName = String(formData.get("pass_name") || "").trim();

  if (!passName || totalSessions < 1) throw new Error("회원권명과 횟수를 확인해 주세요.");

  const { data: member, error: memberError } = await supabase
    .from("members")
    .select("id")
    .eq("id", memberId)
    .eq("organization_id", staff.organization_id)
    .single();

  if (memberError || !member) throw new Error("현재 조직 소속 회원을 찾을 수 없습니다.");

  const { data, error } = await supabase
    .from("member_passes")
    .insert({
      organization_id: staff.organization_id,
      member_id: memberId,
      pass_name: passName,
      service_type: String(formData.get("service_type") || "pt"),
      total_sessions: totalSessions,
      used_sessions: 0,
      remaining_sessions: totalSessions,
      start_date: startDate,
      end_date: String(formData.get("end_date") || "") || null,
      status: "active",
      created_by: staff.id
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  await createAuditLog({
    organizationId: staff.organization_id,
    actorId: staff.id,
    action: "PASS_CREATED",
    entityType: "member_passes",
    entityId: data.id,
    afterData: { passName, totalSessions }
  });

  revalidatePath(`/members/${memberId}`);
}

export async function adjustRemainingSessions(passId: string, amount: number, reason: string) {
  const staff = await requireRole(["owner", "admin"]);
  const supabase = await createSupabaseServerClient();

  const { data: pass, error: passError } = await supabase
    .from("member_passes")
    .select("id")
    .eq("id", passId)
    .eq("organization_id", staff.organization_id)
    .single();

  if (passError || !pass) throw new Error("현재 조직 소속 회원권을 찾을 수 없습니다.");

  const { data, error } = await supabase.rpc("adjust_remaining_sessions", {
    p_pass_id: passId,
    p_amount: amount,
    p_reason: reason,
    p_actor_id: staff.id
  });
  if (error) throw new Error(error.message);
  revalidatePath("/members");
  return data;
}
