"use server";

import { isDemoMode } from "@/lib/config/env";
import { verifyKioskCheckInToken } from "@/lib/kiosk/check-in-token";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { CheckInResult } from "@/lib/types";
import { todayInKorea } from "@/lib/utils/format-date";

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
    return {
      success: false,
      message: "출석 처리에 실패했습니다. 이미 오늘 출석했거나 회원권 상태를 확인해 주세요."
    };
  }
  return data as CheckInResult;
}
