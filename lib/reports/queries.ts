import { shouldUseDemoData } from "@/lib/config/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { addDaysInKorea, todayInKorea } from "@/lib/utils/format-date";

function demoCheckIn(minutesAgo: number) {
  return new Date(Date.now() - minutesAgo * 60000).toISOString();
}

export async function getDashboardMetrics(organizationId: string) {
  if (shouldUseDemoData()) {
    const today = todayInKorea();
    return {
      todayAttendance: 18,
      activeMembers: 126,
      renewalCandidates: 7,
      inactiveMembers: 5,
      monthAttendance: 342,
      todayNoShows: 2,
      todayCancelled: 1,
      sourceCounts: { staff: 6, kiosk: 12, system: 0 },
      recentAttendance: [
        {
          id: "demo-att-1",
          checkin_at: demoCheckIn(4),
          source: "kiosk",
          service_type: "pt",
          members: { id: "demo-member-1", name: "김민수", phone: "01012345678" },
          member_passes: { pass_name: "PT 20회권", remaining_sessions: 8 }
        },
        {
          id: "demo-att-2",
          checkin_at: demoCheckIn(28),
          source: "staff",
          service_type: "conditioning",
          members: { id: "demo-member-2", name: "박서연", phone: "01098761234" },
          member_passes: { pass_name: "컨디셔닝 10회권", remaining_sessions: 3 }
        },
        {
          id: "demo-att-3",
          checkin_at: demoCheckIn(64),
          source: "kiosk",
          service_type: "group",
          members: { id: "demo-member-3", name: "이정훈", phone: "01055557777" },
          member_passes: { pass_name: "그룹 8회권", remaining_sessions: 1 }
        },
        {
          id: "demo-att-4",
          checkin_at: demoCheckIn(104),
          source: "staff",
          service_type: "pt",
          members: { id: "demo-member-4", name: "최지훈", phone: "01011112222" },
          member_passes: { pass_name: "PT 30회권", remaining_sessions: 12 }
        }
      ],
      renewalCandidateList: [
        { id: "demo-pass-1", pass_name: "컨디셔닝 10회권", remaining_sessions: 1, member_id: "demo-member-3", members: { id: "demo-member-3", name: "이정훈", phone: "01055557777", last_visit_date: today } },
        { id: "demo-pass-2", pass_name: "PT 20회권", remaining_sessions: 2, member_id: "demo-member-4", members: { id: "demo-member-4", name: "최유진", phone: "01022223333", last_visit_date: today } },
        { id: "demo-pass-3", pass_name: "체험 3회권", remaining_sessions: 3, member_id: "demo-member-5", members: { id: "demo-member-5", name: "정도윤", phone: "01044445555", last_visit_date: today } }
      ],
      inactiveMemberList: [
        { id: "demo-inactive-1", name: "최지훈", phone: "01011112222", last_visit_date: addDaysInKorea(today, -32) },
        { id: "demo-inactive-2", name: "오하린", phone: "01066668888", last_visit_date: addDaysInKorea(today, -18) }
      ],
      retentionPriorityList: [
        { id: "demo-member-3", name: "이정훈", phone: "01055557777", reason: "잔여 1회", score: 72 },
        { id: "demo-inactive-1", name: "최지훈", phone: "01011112222", reason: "32일 미방문", score: 68 },
        { id: "demo-member-2", name: "박서연", phone: "01098761234", reason: "잔여 3회", score: 45 }
      ]
    };
  }

  const supabase = await createSupabaseServerClient();
  const today = todayInKorea();
  const monthStart = today.slice(0, 8) + "01";
  const inactiveBefore = addDaysInKorea(today, -14);

  const [
    { count: todayAttendance },
    { count: activeMembers },
    { count: renewal },
    { count: inactive },
    { count: monthAttendance },
    { count: todayNoShows },
    { count: todayCancelled },
    { data: todayBySource },
    { data: recent },
    { data: renewalCandidates },
    { data: inactiveMembers }
  ] = await Promise.all([
    supabase.from("attendance_logs").select("id", { count: "exact", head: true }).eq("organization_id", organizationId).eq("attendance_date", today).eq("status", "checked_in"),
    supabase.from("members").select("id", { count: "exact", head: true }).eq("organization_id", organizationId).eq("status", "active"),
    supabase.from("member_passes").select("id", { count: "exact", head: true }).eq("organization_id", organizationId).eq("status", "active").lte("remaining_sessions", 3).gt("remaining_sessions", 0),
    supabase.from("members").select("id", { count: "exact", head: true }).eq("organization_id", organizationId).eq("status", "active").or(`last_visit_date.is.null,last_visit_date.lt.${inactiveBefore}`),
    supabase.from("attendance_logs").select("id", { count: "exact", head: true }).eq("organization_id", organizationId).gte("attendance_date", monthStart).lte("attendance_date", today).eq("status", "checked_in"),
    supabase.from("attendance_logs").select("id", { count: "exact", head: true }).eq("organization_id", organizationId).eq("attendance_date", today).eq("status", "no_show"),
    supabase.from("attendance_logs").select("id", { count: "exact", head: true }).eq("organization_id", organizationId).eq("attendance_date", today).eq("status", "cancelled"),
    supabase.from("attendance_logs").select("source").eq("organization_id", organizationId).eq("attendance_date", today).eq("status", "checked_in"),
    supabase.from("attendance_logs").select("*, members(id, name, phone), member_passes(pass_name, remaining_sessions)").eq("organization_id", organizationId).eq("status", "checked_in").order("checkin_at", { ascending: false }).limit(10),
    supabase.from("member_passes").select("id, pass_name, remaining_sessions, member_id, members(id, name, phone, last_visit_date)").eq("organization_id", organizationId).eq("status", "active").lte("remaining_sessions", 3).gt("remaining_sessions", 0).order("remaining_sessions", { ascending: true }).limit(6),
    supabase.from("members").select("id, name, phone, last_visit_date").eq("organization_id", organizationId).eq("status", "active").or(`last_visit_date.is.null,last_visit_date.lt.${inactiveBefore}`).order("last_visit_date", { ascending: true, nullsFirst: true }).limit(6)
  ]);

  const sourceCounts = (todayBySource ?? []).reduce(
    (acc: { staff: number; kiosk: number; system: number }, row: any) => {
      if (row.source === "kiosk") acc.kiosk += 1;
      if (row.source === "staff") acc.staff += 1;
      if (row.source === "system") acc.system += 1;
      return acc;
    },
    { staff: 0, kiosk: 0, system: 0 }
  );

  const retentionPriorityList = [
    ...(renewalCandidates ?? []).map((row: any) => ({
      id: row.members?.id ?? row.member_id,
      name: row.members?.name ?? "회원",
      phone: row.members?.phone ?? "",
      reason: `잔여 ${row.remaining_sessions}회`,
      score: row.remaining_sessions === 1 ? 72 : 48
    })),
    ...(inactiveMembers ?? []).map((row: any) => ({
      id: row.id,
      name: row.name,
      phone: row.phone,
      reason: "14일 이상 미방문",
      score: 60
    }))
  ].slice(0, 6);

  return {
    todayAttendance: todayAttendance ?? 0,
    activeMembers: activeMembers ?? 0,
    renewalCandidates: renewal ?? 0,
    inactiveMembers: inactive ?? 0,
    monthAttendance: monthAttendance ?? 0,
    todayNoShows: todayNoShows ?? 0,
    todayCancelled: todayCancelled ?? 0,
    sourceCounts,
    recentAttendance: recent ?? [],
    renewalCandidateList: renewalCandidates ?? [],
    inactiveMemberList: inactiveMembers ?? [],
    retentionPriorityList
  };
}

export async function getMonthlySummary(organizationId: string, year: number, month: number) {
  if (shouldUseDemoData()) {
    return Array.from({ length: 24 }, (_, index) => ({
      attendance_date: `${year}-${String(month).padStart(2, "0")}-${String((index % 12) + 1).padStart(2, "0")}`,
      source: index % 3 === 0 ? "staff" : "kiosk",
      member_id: `demo-member-${index % 7}`,
      status: index === 5 ? "cancelled" : index === 11 ? "no_show" : "checked_in",
      member_passes:
        index % 5 === 0
          ? { pass_name: "OT", total_sessions: 1, end_date: null }
          : index % 4 === 0
            ? { pass_name: "한달 등록권", total_sessions: 999, end_date: `${year}-${String(month).padStart(2, "0")}-28` }
            : { pass_name: "10회 등록권", total_sessions: 10, end_date: null }
    }));
  }

  const supabase = await createSupabaseServerClient();
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const end = addDaysInKorea(start, new Date(year, month, 0).getDate() - 1);
  const { data, error } = await supabase
    .from("attendance_logs")
    .select("attendance_date, source, member_id, status, member_passes(pass_name, total_sessions, end_date)")
    .eq("organization_id", organizationId)
    .gte("attendance_date", start)
    .lte("attendance_date", end);

  if (error) throw new Error(error.message);
  return data ?? [];
}
