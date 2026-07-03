"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole, requireStaffUser } from "@/lib/auth/require-staff";
import { isDemoMode } from "@/lib/config/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { CheckInResult } from "@/lib/types";
import { todayInKorea } from "@/lib/utils/format-date";

export async function checkInMember(formData: FormData): Promise<CheckInResult> {
  const staff = await requireStaffUser();
  const memberId = String(formData.get("member_id") || "");
  const memberPassId = String(formData.get("member_pass_id") || "");
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase.rpc("check_in_member", {
    p_member_id: memberId,
    p_member_pass_id: memberPassId,
    p_actor_id: staff.id,
    p_source: "staff"
  });

  if (error) return { success: false, message: error.message };

  revalidatePath("/dashboard");
  revalidatePath("/attendance/today");
  revalidatePath(`/members/${memberId}`);
  return data as CheckInResult;
}

export async function checkInMemberAndRedirect(formData: FormData) {
  const result = await checkInMember(formData);
  const params = new URLSearchParams({
    ok: String(result.success),
    name: result.memberMaskedName ?? "회원",
    pass: result.passName ?? "",
    remaining: String(result.remainingSessionsAfterCheckIn ?? ""),
    count: String(result.attendanceSessionNumber ?? ""),
    date: result.attendanceDate ?? todayInKorea(),
    message: result.message
  });

  redirect(`/check-in/success?${params.toString()}`);
}

export async function cancelAttendance(attendanceId: string, reason: string) {
  const staff = await requireRole(["owner", "admin"]);

  if (isDemoMode()) {
    revalidatePath("/attendance/today");
    revalidatePath("/dashboard");
    return;
  }

  const supabase = await createSupabaseServerClient();
  const { data: log, error: logError } = await supabase
    .from("attendance_logs")
    .select("id")
    .eq("id", attendanceId)
    .eq("organization_id", staff.organization_id)
    .single();

  if (logError || !log) throw new Error("현재 조직 소속 출석 기록을 찾을 수 없습니다.");

  const { error } = await supabase.rpc("cancel_attendance", {
    p_attendance_id: attendanceId,
    p_reason: reason,
    p_actor_id: staff.id
  });

  if (error) throw new Error(error.message);

  revalidatePath("/attendance/today");
  revalidatePath("/dashboard");
}

export async function cancelAttendanceFromForm(formData: FormData) {
  const attendanceId = String(formData.get("attendance_id") || "");
  const memberId = String(formData.get("member_id") || "");
  const reason = String(formData.get("reason") || "").trim();

  if (!attendanceId) throw new Error("취소할 출석 기록을 찾을 수 없습니다.");
  if (reason.length < 2) throw new Error("취소 사유를 2자 이상 입력해 주세요.");

  await cancelAttendance(attendanceId, reason);
  if (memberId) revalidatePath(`/members/${memberId}`);
}

export async function markNoShow(formData: FormData) {
  const staff = await requireStaffUser();
  const memberId = String(formData.get("member_id") || "");
  const memberPassId = String(formData.get("member_pass_id") || "") || null;

  if (isDemoMode()) {
    revalidatePath("/attendance/today");
    revalidatePath(`/members/${memberId}`);
    return;
  }

  const supabase = await createSupabaseServerClient();
  const { data: member, error: memberError } = await supabase
    .from("members")
    .select("id")
    .eq("id", memberId)
    .eq("organization_id", staff.organization_id)
    .single();

  if (memberError || !member) throw new Error("현재 조직 소속 회원을 찾을 수 없습니다.");

  if (memberPassId) {
    const { data: pass, error: passError } = await supabase
      .from("member_passes")
      .select("id")
      .eq("id", memberPassId)
      .eq("member_id", memberId)
      .eq("organization_id", staff.organization_id)
      .single();

    if (passError || !pass) throw new Error("현재 조직 소속 회원권을 찾을 수 없습니다.");
  }

  const { error } = await supabase.from("attendance_logs").insert({
    organization_id: staff.organization_id,
    member_id: memberId,
    member_pass_id: memberPassId,
    attendance_date: todayInKorea(),
    checkin_at: new Date().toISOString(),
    status: "no_show",
    source: "staff",
    deducted_sessions: 0,
    checked_by: staff.id,
    memo: String(formData.get("memo") || "") || null
  });

  if (error) throw new Error(error.message);

  revalidatePath("/attendance/today");
  revalidatePath(`/members/${memberId}`);
}
