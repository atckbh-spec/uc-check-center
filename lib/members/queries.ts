import { shouldUseDemoData } from "@/lib/config/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AttendanceLog, Member, MemberNote, MemberPass } from "@/lib/types";
import { addDaysInKorea, todayInKorea } from "@/lib/utils/format-date";

const today = todayInKorea();

const demoAttendance = [
  { id: "demo-log-1", organization_id: "demo-organization", member_id: "demo-member-1", member_pass_id: "demo-pass-1", checkin_at: new Date().toISOString(), attendance_date: today, source: "kiosk", status: "checked_in", deducted_sessions: 1, service_type: "pt", checked_by: null, cancelled_by: null, cancelled_at: null, memo: null },
  { id: "demo-log-2", organization_id: "demo-organization", member_id: "demo-member-1", member_pass_id: "demo-pass-1", checkin_at: new Date(Date.now() - 3 * 86400000).toISOString(), attendance_date: addDaysInKorea(today, -3), source: "staff", status: "checked_in", deducted_sessions: 1, service_type: "pt", checked_by: "demo-staff", cancelled_by: null, cancelled_at: null, memo: null },
  { id: "demo-log-3", organization_id: "demo-organization", member_id: "demo-member-1", member_pass_id: "demo-pass-1", checkin_at: new Date(Date.now() - 8 * 86400000).toISOString(), attendance_date: addDaysInKorea(today, -8), source: "kiosk", status: "checked_in", deducted_sessions: 1, service_type: "pt", checked_by: null, cancelled_by: null, cancelled_at: null, memo: null },
  { id: "demo-log-4", organization_id: "demo-organization", member_id: "demo-member-1", member_pass_id: "demo-pass-1", checkin_at: new Date(Date.now() - 16 * 86400000).toISOString(), attendance_date: addDaysInKorea(today, -16), source: "staff", status: "no_show", deducted_sessions: 0, service_type: "pt", checked_by: "demo-staff", cancelled_by: null, cancelled_at: null, memo: "예약 시간 미도착" }
] satisfies AttendanceLog[];

const demoNotes = [
  {
    id: "demo-note-1",
    organization_id: "demo-organization",
    member_id: "demo-member-1",
    note_type: "renewal",
    content: "잔여 3회 이하 진입 시 다음 회차 재등록 상담 예정.",
    is_pinned: true,
    created_by: "demo-staff",
    created_at: new Date(Date.now() - 2 * 86400000).toISOString()
  },
  {
    id: "demo-note-2",
    organization_id: "demo-organization",
    member_id: "demo-member-1",
    note_type: "schedule",
    content: "오전 시간대보다 저녁 타임 출석률이 높음.",
    is_pinned: false,
    created_by: "demo-staff",
    created_at: new Date(Date.now() - 6 * 86400000).toISOString()
  }
] satisfies MemberNote[];

const demoMembers = [
  {
    id: "demo-member-1",
    organization_id: "demo-organization",
    name: "김민수",
    phone: "01012345678",
    phone_last4: "5678",
    status: "active",
    assigned_coach_id: null,
    first_visit_date: "2026-05-01",
    last_visit_date: today,
    memo: null,
    member_passes: [
      {
        id: "demo-pass-1",
        organization_id: "demo-organization",
        member_id: "demo-member-1",
        pass_name: "PT 20회권",
        service_type: "pt",
        remaining_sessions: 8,
        used_sessions: 12,
        total_sessions: 20,
        start_date: "2026-06-01",
        end_date: null,
        status: "active",
        assigned_coach_id: null
      }
    ],
    attendance_logs: demoAttendance,
    member_notes: demoNotes
  },
  {
    id: "demo-member-2",
    organization_id: "demo-organization",
    name: "박서연",
    phone: "01098761234",
    phone_last4: "1234",
    status: "active",
    assigned_coach_id: null,
    first_visit_date: "2026-04-15",
    last_visit_date: addDaysInKorea(today, -2),
    memo: null,
    member_passes: [
      {
        id: "demo-pass-2",
        organization_id: "demo-organization",
        member_id: "demo-member-2",
        pass_name: "컨디셔닝 10회권",
        service_type: "conditioning",
        remaining_sessions: 3,
        used_sessions: 7,
        total_sessions: 10,
        start_date: "2026-06-10",
        end_date: null,
        status: "active",
        assigned_coach_id: null
      }
    ],
    attendance_logs: demoAttendance.slice(0, 3),
    member_notes: []
  },
  {
    id: "demo-member-3",
    organization_id: "demo-organization",
    name: "최지훈",
    phone: "01011112222",
    phone_last4: "2222",
    status: "active",
    assigned_coach_id: null,
    first_visit_date: "2026-02-20",
    last_visit_date: addDaysInKorea(today, -32),
    memo: null,
    member_passes: [
      {
        id: "demo-pass-3",
        organization_id: "demo-organization",
        member_id: "demo-member-3",
        pass_name: "PT 30회권",
        service_type: "pt",
        remaining_sessions: 12,
        used_sessions: 18,
        total_sessions: 30,
        start_date: "2026-04-01",
        end_date: null,
        status: "active",
        assigned_coach_id: null
      }
    ],
    attendance_logs: demoAttendance.slice(2),
    member_notes: []
  }
];

export async function searchMembers(query = "", organizationId: string) {
  if (shouldUseDemoData()) {
    if (!query) return demoMembers;
    return demoMembers.filter((member) => member.name.includes(query) || member.phone_last4 === query.slice(-4));
  }

  const supabase = await createSupabaseServerClient();
  let request = supabase
    .from("members")
    .select("*, member_passes(*)")
    .eq("organization_id", organizationId)
    .neq("status", "archived")
    .order("created_at", { ascending: false });

  if (query) {
    request = request.or(`name.ilike.%${query}%,phone_last4.eq.${query.slice(-4)}`);
  }

  const { data, error } = await request.limit(80);
  if (error) throw new Error(error.message);
  return data ?? [];
}

export type MemberDetail = Member & {
  member_passes: MemberPass[];
  attendance_logs: AttendanceLog[];
  member_notes: MemberNote[];
};

export async function getMemberDetail(memberId: string, organizationId: string): Promise<MemberDetail> {
  if (shouldUseDemoData()) {
    const member = demoMembers.find((item) => item.id === memberId) ?? demoMembers[0];
    return member as unknown as MemberDetail;
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("members")
    .select("*, member_passes(*), attendance_logs(*), member_notes(*)")
    .eq("id", memberId)
    .eq("organization_id", organizationId)
    .single();

  if (error) throw new Error(error.message);

  const detail = data as MemberDetail;
  detail.member_passes = [...(detail.member_passes ?? [])].sort((a, b) => {
    if (a.status === b.status) return new Date(b.start_date).getTime() - new Date(a.start_date).getTime();
    return a.status === "active" ? -1 : 1;
  });
  detail.attendance_logs = [...(detail.attendance_logs ?? [])].sort((a, b) => new Date(b.checkin_at).getTime() - new Date(a.checkin_at).getTime());
  detail.member_notes = [...(detail.member_notes ?? [])].sort((a, b) => {
    if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  return detail;
}

export async function getMemberActivePasses(memberId: string, organizationId: string) {
  if (shouldUseDemoData()) {
    const member = demoMembers.find((item) => item.id === memberId) ?? demoMembers[0];
    return member.member_passes as unknown as MemberPass[];
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("member_passes")
    .select("*")
    .eq("member_id", memberId)
    .eq("organization_id", organizationId)
    .eq("status", "active")
    .gt("remaining_sessions", 0)
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  return data as MemberPass[];
}
