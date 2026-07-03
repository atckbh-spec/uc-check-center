"use server";

import { isDemoMode } from "@/lib/config/env";
import { verifyKioskCheckInToken } from "@/lib/kiosk/check-in-token";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { CheckInResult } from "@/lib/types";
import { todayInKorea } from "@/lib/utils/format-date";
import { maskKoreanName } from "@/lib/utils/mask-phone";

type KioskCheckInContext = {
  member: {
    id: string;
    organization_id: string;
    name: string;
    status: string;
  };
  pass: {
    id: string;
    organization_id: string;
    member_id: string;
    pass_name: string;
    service_type: string;
    status: string;
    remaining_sessions: number;
    used_sessions: number;
    end_date: string | null;
  };
};

async function getKioskCheckInContext(supabase: ReturnType<typeof createSupabaseAdminClient>, memberId: string, memberPassId: string) {
  const today = todayInKorea();
  const { data: member, error: memberError } = await supabase
    .from("members")
    .select("id, organization_id, name, status")
    .eq("id", memberId)
    .single();

  if (memberError || !member || member.status !== "active") {
    return { message: "출석 가능한 회원이 아닙니다. 스태프에게 문의해 주세요." };
  }

  const { data: pass, error: passError } = await supabase
    .from("member_passes")
    .select("id, organization_id, member_id, pass_name, service_type, status, remaining_sessions, used_sessions, end_date")
    .eq("id", memberPassId)
    .eq("member_id", memberId)
    .single();

  if (passError || !pass) {
    return { message: "회원권을 찾을 수 없습니다. 스태프에게 문의해 주세요." };
  }

  if (pass.organization_id !== member.organization_id) {
    return { message: "회원권 정보가 일치하지 않습니다. 스태프에게 문의해 주세요." };
  }

  if (pass.status !== "active" || Number(pass.remaining_sessions) <= 0) {
    return { message: "출석 가능한 활성 회원권이 없습니다. 스태프에게 문의해 주세요." };
  }

  if (pass.end_date && pass.end_date < today) {
    return { message: "만료된 회원권입니다. 스태프에게 문의해 주세요." };
  }

  const { data: existing, error: existingError } = await supabase
    .from("attendance_logs")
    .select("id")
    .eq("member_id", memberId)
    .eq("member_pass_id", memberPassId)
    .eq("attendance_date", today)
    .eq("status", "checked_in")
    .maybeSingle();

  if (existingError) {
    console.error("Kiosk duplicate attendance check failed", { memberId, memberPassId, existingError });
    return { message: "출석 상태를 확인하지 못했습니다. 스태프에게 문의해 주세요." };
  }

  if (existing) {
    return { message: "오늘 이미 출석 처리되었습니다." };
  }

  return { context: { member, pass } as KioskCheckInContext };
}

async function directKioskCheckIn(supabase: ReturnType<typeof createSupabaseAdminClient>, context: KioskCheckInContext): Promise<CheckInResult> {
  const today = todayInKorea();
  const remainingAfter = Number(context.pass.remaining_sessions) - 1;
  const attendanceNumber = Number(context.pass.used_sessions) + 1;

  const { data: attendance, error: insertError } = await supabase
    .from("attendance_logs")
    .insert({
      organization_id: context.member.organization_id,
      member_id: context.member.id,
      member_pass_id: context.pass.id,
      attendance_date: today,
      service_type: context.pass.service_type,
      status: "checked_in",
      source: "kiosk",
      deducted_sessions: 1,
      checked_by: null
    })
    .select("id")
    .single();

  if (insertError || !attendance) {
    console.error("Direct kiosk attendance insert failed", {
      memberId: context.member.id,
      memberPassId: context.pass.id,
      insertError
    });
    return { success: false, message: "출석 기록을 저장하지 못했습니다. 스태프에게 문의해 주세요." };
  }

  const { error: passError } = await supabase
    .from("member_passes")
    .update({
      used_sessions: attendanceNumber,
      remaining_sessions: remainingAfter,
      status: remainingAfter <= 0 ? "used_up" : context.pass.status,
      updated_at: new Date().toISOString()
    })
    .eq("id", context.pass.id)
    .eq("member_id", context.member.id);

  if (passError) {
    console.error("Direct kiosk pass update failed", {
      attendanceId: attendance.id,
      memberPassId: context.pass.id,
      passError
    });
    return { success: false, message: "회원권 차감에 실패했습니다. 스태프에게 문의해 주세요." };
  }

  const { error: memberError } = await supabase
    .from("members")
    .update({ last_visit_date: today, updated_at: new Date().toISOString() })
    .eq("id", context.member.id)
    .eq("organization_id", context.member.organization_id);

  if (memberError) {
    console.error("Direct kiosk member update failed", {
      attendanceId: attendance.id,
      memberId: context.member.id,
      memberError
    });
  }

  const { error: auditError } = await supabase.from("audit_logs").insert({
    organization_id: context.member.organization_id,
    actor_id: null,
    action: "KIOSK_CHECK_IN",
    entity_type: "members",
    entity_id: context.member.id,
    after_data: {
      member_pass_id: context.pass.id,
      remaining_after: remainingAfter,
      source: "kiosk",
      fallback: true
    }
  });

  if (auditError) {
    console.error("Direct kiosk audit log failed", { attendanceId: attendance.id, auditError });
  }

  return {
    success: true,
    message: "출석 체크가 완료되었습니다.",
    memberMaskedName: maskKoreanName(context.member.name),
    passName: context.pass.pass_name,
    remainingSessionsAfterCheckIn: remainingAfter,
    attendanceSessionNumber: attendanceNumber,
    attendanceDate: today
  };
}

export async function checkInMemberFromKiosk(memberId: string, memberPassId: string, token: string): Promise<CheckInResult> {
  const tokenOk = verifyKioskCheckInToken(token, memberId, memberPassId);
  if (!tokenOk) {
    return {
      success: false,
      message: "확인 시간이 만료되었습니다. 처음 화면에서 다시 입력해 주세요."
    };
  }

  if (isDemoMode()) {
    return {
      success: true,
      message: "출석 체크가 완료되었습니다.",
      memberMaskedName: memberId === "demo-member-2" ? "박O연" : memberId === "demo-member-3" ? "이O훈" : "김O수",
      passName: memberPassId === "demo-pass-2" ? "컨디셔닝 10회권" : memberPassId === "demo-pass-3" ? "그룹 8회권" : "PT 20회권",
      remainingSessionsAfterCheckIn: memberPassId === "demo-pass-2" ? 2 : memberPassId === "demo-pass-3" ? 0 : 7,
      attendanceSessionNumber: memberPassId === "demo-pass-2" ? 8 : memberPassId === "demo-pass-3" ? 8 : 13,
      attendanceDate: todayInKorea()
    };
  }

  const supabase = createSupabaseAdminClient();
  const prepared = await getKioskCheckInContext(supabase, memberId, memberPassId);
  if ("message" in prepared) {
    return { success: false, message: prepared.message ?? "출석 처리에 실패했습니다. 스태프에게 문의해 주세요." };
  }

  const { data, error } = await supabase.rpc("check_in_member", {
    p_member_id: memberId,
    p_member_pass_id: memberPassId,
    p_actor_id: null,
    p_source: "kiosk"
  });

  if (error) {
    console.error("Kiosk check-in failed", {
      memberId,
      memberPassId,
      code: error.code,
      message: error.message
    });
    return directKioskCheckIn(supabase, prepared.context);
  }
  return data as CheckInResult;
}
