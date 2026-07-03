import { isDemoMode } from "@/lib/config/env";
import { createKioskCheckInToken } from "@/lib/kiosk/check-in-token";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { todayInKorea } from "@/lib/utils/format-date";
import { maskKoreanName, maskPhone } from "@/lib/utils/mask-phone";

export type KioskPassPreview = {
  id: string;
  pass_name: string;
  remaining_sessions: number;
  status: string;
  end_date?: string | null;
};

export type KioskCandidate = {
  id: string;
  maskedName: string;
  maskedPhone: string;
  activePass: KioskPassPreview | null;
  checkInToken?: string;
};

export type KioskSearchResult = {
  last4: string;
  isValid: boolean;
  candidates: KioskCandidate[];
  tooMany: boolean;
  message?: string;
};

export type KioskMemberPreview = {
  id: string;
  maskedName: string;
  maskedPhone: string;
  pass: KioskPassPreview | null;
  canCheckIn: boolean;
  message?: string;
};

const demoKioskMembers = [
  {
    id: "demo-member-1",
    name: "김민수",
    phone: "01012345678",
    activePass: { id: "demo-pass-1", pass_name: "PT 20회권", remaining_sessions: 8, status: "active", end_date: null }
  },
  {
    id: "demo-member-2",
    name: "박서연",
    phone: "01098761234",
    activePass: { id: "demo-pass-2", pass_name: "컨디셔닝 10회권", remaining_sessions: 3, status: "active", end_date: null }
  },
  {
    id: "demo-member-3",
    name: "이정훈",
    phone: "01055557777",
    activePass: { id: "demo-pass-3", pass_name: "그룹 8회권", remaining_sessions: 1, status: "active", end_date: null }
  }
];

function normalizeLast4(phoneLast4: string) {
  return phoneLast4.replace(/\D/g, "").slice(0, 4);
}

function pickActivePass(memberPasses: KioskPassPreview[] | null | undefined) {
  const today = todayInKorea();
  return (memberPasses ?? []).find((pass) => pass.status === "active" && pass.remaining_sessions > 0 && (!pass.end_date || pass.end_date >= today)) ?? null;
}

export async function getKioskSearchResultByLast4(phoneLast4: string): Promise<KioskSearchResult> {
  const last4 = normalizeLast4(phoneLast4);

  if (!/^\d{4}$/.test(last4)) {
    return {
      last4,
      isValid: false,
      candidates: [],
      tooMany: false,
      message: "전화번호 마지막 4자리를 정확히 입력해 주세요."
    };
  }

  if (isDemoMode()) {
    const rows = demoKioskMembers.filter((member) => member.phone.endsWith(last4));
    return {
      last4,
      isValid: true,
      candidates: rows.slice(0, 5).map((member) => {
        const activePass = pickActivePass([member.activePass]);
        return {
          id: member.id,
          maskedName: maskKoreanName(member.name),
          maskedPhone: maskPhone(member.phone),
          activePass,
          checkInToken: activePass ? createKioskCheckInToken(member.id, activePass.id) : undefined
        };
      }),
      tooMany: rows.length > 5,
      message: rows.length > 5 ? "같은 번호의 후보가 많습니다. 정확한 확인을 위해 스태프에게 문의해 주세요." : undefined
    };
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("members")
    .select("id, name, phone, member_passes(id, pass_name, remaining_sessions, status, end_date)")
    .eq("phone_last4", last4)
    .eq("status", "active")
    .order("name", { ascending: true })
    .limit(6);

  if (error) throw new Error(error.message);

  const rows = data ?? [];
  const tooMany = rows.length > 5;
  const candidates = rows.slice(0, 5).map((member) => {
    const activePass = pickActivePass((member.member_passes ?? []) as KioskPassPreview[]);
    return {
      id: member.id,
      maskedName: maskKoreanName(member.name),
      maskedPhone: maskPhone(member.phone),
      activePass,
      checkInToken: activePass ? createKioskCheckInToken(member.id, activePass.id) : undefined
    };
  });

  return {
    last4,
    isValid: true,
    candidates,
    tooMany,
    message: tooMany ? "같은 번호의 후보가 많습니다. 정확한 확인을 위해 스태프에게 문의해 주세요." : undefined
  };
}

export async function findKioskCandidatesByLast4(phoneLast4: string) {
  return getKioskSearchResultByLast4(phoneLast4);
}

export async function getKioskMemberPreview(memberId: string, memberPassId: string): Promise<KioskMemberPreview> {
  if (isDemoMode()) {
    const member = demoKioskMembers.find((item) => item.id === memberId);
    if (!member) {
      return {
        id: memberId,
        maskedName: "회원",
        maskedPhone: "",
        pass: null,
        canCheckIn: false,
        message: "회원 정보를 찾을 수 없습니다. 스태프에게 문의해 주세요."
      };
    }
    const pass = member.activePass.id === memberPassId ? member.activePass : null;
    return {
      id: member.id,
      maskedName: maskKoreanName(member.name),
      maskedPhone: maskPhone(member.phone),
      pass,
      canCheckIn: Boolean(pass && pass.remaining_sessions > 0),
      message: pass ? undefined : "출석 가능한 활성 회원권이 없습니다. 스태프에게 문의해 주세요."
    };
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("members")
    .select("id, name, phone, member_passes(id, pass_name, remaining_sessions, status, end_date)")
    .eq("id", memberId)
    .eq("status", "active")
    .single();

  if (error || !data) {
    return {
      id: memberId,
      maskedName: "회원",
      maskedPhone: "",
      pass: null,
      canCheckIn: false,
      message: "회원 정보를 찾을 수 없습니다. 스태프에게 문의해 주세요."
    };
  }

  const pass = ((data.member_passes ?? []) as KioskPassPreview[]).find((item) => item.id === memberPassId && item.status === "active") ?? null;
  const today = todayInKorea();

  if (!pass || pass.remaining_sessions <= 0 || (pass.end_date && pass.end_date < today)) {
    return {
      id: data.id,
      maskedName: maskKoreanName(data.name),
      maskedPhone: maskPhone(data.phone),
      pass,
      canCheckIn: false,
      message: "출석 가능한 활성 회원권이 없습니다. 스태프에게 문의해 주세요."
    };
  }

  return {
    id: data.id,
    maskedName: maskKoreanName(data.name),
    maskedPhone: maskPhone(data.phone),
    pass,
    canCheckIn: true
  };
}
