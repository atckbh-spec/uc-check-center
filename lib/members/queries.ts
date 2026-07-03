import { shouldUseDemoData } from "@/lib/config/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Member, MemberPass } from "@/lib/types";
import { addDaysInKorea, todayInKorea } from "@/lib/utils/format-date";

const today = todayInKorea();

const demoAttendance = [
  { id: "demo-log-1", checkin_at: new Date().toISOString(), attendance_date: today, source: "kiosk", status: "checked_in", deducted_sessions: 1 },
  { id: "demo-log-2", checkin_at: new Date(Date.now() - 3 * 86400000).toISOString(), attendance_date: addDaysInKorea(today, -3), source: "staff", status: "checked_in", deducted_sessions: 1 },
  { id: "demo-log-3", checkin_at: new Date(Date.now() - 8 * 86400000).toISOString(), attendance_date: addDaysInKorea(today, -8), source: "kiosk", status: "checked_in", deducted_sessions: 1 },
  { id: "demo-log-4", checkin_at: new Date(Date.now() - 16 * 86400000).toISOString(), attendance_date: addDaysInKorea(today, -16), source: "staff", status: "no_show", deducted_sessions: 0 }
];

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
    attendance_logs: demoAttendance
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
    attendance_logs: demoAttendance.slice(0, 3)
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
    attendance_logs: demoAttendance.slice(2)
  }
];

export async function searchMembers(query = "", organizationId: string) {
  if (shouldUseDemoData()) {
    const rows = !query ? demoMembers : demoMembers.filter((member) => member.name.includes(query) || member.phone_last4 === query.slice(-4));
    return [...rows].sort((a, b) => a.name.localeCompare(b.name, "ko-KR"));
  }

  const supabase = await createSupabaseServerClient();
  const today = todayInKorea();
  let request = supabase
    .from("members")
    .select("*, member_passes(*), attendance_logs(id, member_pass_id, attendance_date, status, checkin_at)")
    .eq("organization_id", organizationId)
    .neq("status", "archived")
    .eq("attendance_logs.attendance_date", today)
    .order("name", { ascending: true });

  if (query) {
    request = request.or(`name.ilike.%${query}%,phone_last4.eq.${query.slice(-4)}`);
  }

  const { data, error } = await request.limit(80);
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getMemberDetail(memberId: string, organizationId: string) {
  if (shouldUseDemoData()) {
    const member = demoMembers.find((item) => item.id === memberId) ?? demoMembers[0];
    return member as unknown as Member & { member_passes: MemberPass[]; attendance_logs: unknown[] };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("members")
    .select("*, member_passes(*), attendance_logs(*)")
    .eq("id", memberId)
    .eq("organization_id", organizationId)
    .single();

  if (error) throw new Error(error.message);
  return data as Member & { member_passes: MemberPass[]; attendance_logs: unknown[] };
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
