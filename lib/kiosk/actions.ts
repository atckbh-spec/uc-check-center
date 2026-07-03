"use server";

import { isDemoMode } from "@/lib/config/env";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { CheckInResult } from "@/lib/types";
import { todayInKorea } from "@/lib/utils/format-date";
import { digitsOnly, hashMemberPin, normalizePin } from "@/lib/utils/member-pin";

async function validateKioskMemberPin(memberId: string, pin: string) {
  const normalizedPin = normalizePin(pin);
  if (!/^\d{4,8}$/.test(normalizedPin)) return false;

  if (isDemoMode()) {
    const demoLast4ByMember: Record<string, string> = {
      "demo-member-1": "5678",
      "demo-member-2": "1234",
      "demo-member-3": "7777"
    };
    return normalizedPin === demoLast4ByMember[memberId];
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("members")
    .select("organization_id, phone, phone_last4, pin_hash")
    .eq("id", memberId)
    .eq("status", "active")
    .single();

  if (error || !data) return false;

  if (!data.pin_hash) {
    return normalizedPin === data.phone_last4 || normalizedPin === digitsOnly(data.phone).slice(-4);
  }

  return hashMemberPin(data.organization_id, data.phone, normalizedPin) === data.pin_hash;
}

export async function checkInMemberFromKiosk(memberId: string, memberPassId: string, pin: string): Promise<CheckInResult> {
  const pinOk = await validateKioskMemberPin(memberId, pin);
  if (!pinOk) {
    return {
      success: false,
      message: "개인 PIN 번호가 일치하지 않습니다. 다시 입력하거나 스태프에게 문의해 주세요."
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
  const { data, error } = await supabase.rpc("check_in_member", {
    p_member_id: memberId,
    p_member_pass_id: memberPassId,
    p_actor_id: null,
    p_source: "kiosk"
  });

  if (error) return { success: false, message: error.message };
  return data as CheckInResult;
}
