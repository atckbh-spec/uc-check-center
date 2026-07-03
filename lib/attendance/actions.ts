"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAuditLog } from "@/lib/audit/actions";
import { requireRole, requireStaffUser } from "@/lib/auth/require-staff";
import { isDemoMode } from "@/lib/config/env";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { CheckInResult } from "@/lib/types";
import { todayInKorea } from "@/lib/utils/format-date";

function refreshAttendanceViews(memberId?: string) {
  revalidatePath("/dashboard");
  revalidatePath("/attendance/today");
  revalidatePath("/members");
  if (memberId) revalidatePath(`/members/${memberId}`);
}

function checkInAtForDate(attendanceDate: string) {
  if (attendanceDate === todayInKorea()) return new Date().toISOString();
  return new Date(`${attendanceDate}T12:00:00+09:00`).toISOString();
}

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

  if (error) {
    console.error("Manual check-in failed", {
      memberId,
      memberPassId,
      code: error.code,
      message: error.message
    });
    return { success: false, message: error.message };
  }

  refreshAttendanceViews(memberId);
  return data as CheckInResult;
}

export async function manualAttendanceFromForm(formData: FormData) {
  const staff = await requireStaffUser();
  const memberId = String(formData.get("member_id") || "");
  const memberPassId = String(formData.get("member_pass_id") || "");
  const attendanceDate = String(formData.get("attendance_date") || todayInKorea());
  const memo = String(formData.get("memo") || "수기 출석 처리").trim();

  if (!memberId || !memberPassId || !/^\d{4}-\d{2}-\d{2}$/.test(attendanceDate)) {
    refreshAttendanceViews(memberId);
    return;
  }

  if (isDemoMode()) {
    refreshAttendanceViews(memberId);
    return;
  }

  const supabase = createSupabaseAdminClient();
  const { data: member, error: memberError } = await supabase
    .from("members")
    .select("id, organization_id, status, last_visit_date")
    .eq("id", memberId)
    .eq("organization_id", staff.organization_id)
    .single();

  if (memberError || !member || member.status !== "active") {
    console.error("Manual attendance member validation failed", { memberId, memberError });
    refreshAttendanceViews(memberId);
    return;
  }

  const { data: pass, error: passError } = await supabase
    .from("member_passes")
    .select("id, organization_id, member_id, pass_name, service_type, status, used_sessions, remaining_sessions")
    .eq("id", memberPassId)
    .eq("member_id", memberId)
    .eq("organization_id", staff.organization_id)
    .single();

  if (passError || !pass || pass.status !== "active" || Number(pass.remaining_sessions) <= 0) {
    console.error("Manual attendance pass validation failed", { memberId, memberPassId, passError });
    refreshAttendanceViews(memberId);
    return;
  }

  const { data: existing, error: existingError } = await supabase
    .from("attendance_logs")
    .select("id")
    .eq("organization_id", staff.organization_id)
    .eq("member_id", memberId)
    .eq("member_pass_id", memberPassId)
    .eq("attendance_date", attendanceDate)
    .eq("status", "checked_in")
    .maybeSingle();

  if (existingError || existing) {
    if (existingError) console.error("Manual attendance duplicate check failed", { memberId, memberPassId, attendanceDate, existingError });
    refreshAttendanceViews(memberId);
    return;
  }

  const { data: attendance, error: insertError } = await supabase
    .from("attendance_logs")
    .insert({
      organization_id: staff.organization_id,
      member_id: memberId,
      member_pass_id: memberPassId,
      checkin_at: checkInAtForDate(attendanceDate),
      attendance_date: attendanceDate,
      service_type: pass.service_type,
      status: "checked_in",
      source: "staff",
      deducted_sessions: 1,
      checked_by: staff.id,
      memo
    })
    .select("id")
    .single();

  if (insertError || !attendance) {
    console.error("Manual attendance insert failed", {
      memberId,
      memberPassId,
      attendanceDate,
      code: insertError?.code,
      message: insertError?.message
    });
    refreshAttendanceViews(memberId);
    return;
  }

  const remainingAfter = Number(pass.remaining_sessions) - 1;
  const { error: passUpdateError } = await supabase
    .from("member_passes")
    .update({
      used_sessions: Number(pass.used_sessions) + 1,
      remaining_sessions: remainingAfter,
      status: remainingAfter <= 0 ? "used_up" : pass.status,
      updated_at: new Date().toISOString()
    })
    .eq("id", memberPassId)
    .eq("organization_id", staff.organization_id);

  if (passUpdateError) {
    console.error("Manual attendance pass update failed", {
      memberId,
      memberPassId,
      attendanceId: attendance.id,
      error: passUpdateError
    });
  }

  if (!member.last_visit_date || attendanceDate > member.last_visit_date) {
    await supabase
      .from("members")
      .update({ last_visit_date: attendanceDate, updated_at: new Date().toISOString() })
      .eq("id", memberId)
      .eq("organization_id", staff.organization_id);
  }

  try {
    await createAuditLog({
      organizationId: staff.organization_id,
      actorId: staff.id,
      action: "MANUAL_ATTENDANCE_CREATED",
      entityType: "attendance_logs",
      entityId: attendance.id,
      afterData: {
        member_id: memberId,
        member_pass_id: memberPassId,
        attendance_date: attendanceDate,
        remaining_after: remainingAfter
      }
    });
  } catch (auditError) {
    console.error("Manual attendance audit log failed", { attendanceId: attendance.id, auditError });
  }

  refreshAttendanceViews(memberId);
}

export async function checkInMemberFromForm(formData: FormData) {
  await manualAttendanceFromForm(formData);
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
    refreshAttendanceViews();
    return;
  }

  const supabase = await createSupabaseServerClient();
  const { data: log, error: logError } = await supabase
    .from("attendance_logs")
    .select("id, member_id")
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

  refreshAttendanceViews(log.member_id);
}

export async function cancelAttendanceFromForm(formData: FormData) {
  const attendanceId = String(formData.get("attendance_id") || "");
  const memberId = String(formData.get("member_id") || "");
  const reason = String(formData.get("reason") || "수기 출석 취소").trim();

  if (!attendanceId) {
    refreshAttendanceViews(memberId);
    return;
  }

  await cancelAttendance(attendanceId, reason.length >= 2 ? reason : "수기 출석 취소");
  if (memberId) refreshAttendanceViews(memberId);
}

export async function markNoShow(formData: FormData) {
  const staff = await requireStaffUser();
  const memberId = String(formData.get("member_id") || "");
  const memberPassId = String(formData.get("member_pass_id") || "") || null;

  if (isDemoMode()) {
    refreshAttendanceViews(memberId);
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

  refreshAttendanceViews(memberId);
}
