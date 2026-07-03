import { shouldUseDemoData } from "@/lib/config/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { todayInKorea } from "@/lib/utils/format-date";

export async function getTodayAttendance(organizationId: string) {
  if (shouldUseDemoData()) {
    return [
      {
        id: "demo-today-1",
        member_id: "demo-member-1",
        checkin_at: new Date().toISOString(),
        source: "kiosk",
        deducted_sessions: 1,
        status: "checked_in",
        members: { name: "김민수", phone: "01012345678" },
        member_passes: { pass_name: "PT 20회권", remaining_sessions: 8 }
      },
      {
        id: "demo-today-2",
        member_id: "demo-member-2",
        checkin_at: new Date(Date.now() - 32 * 60000).toISOString(),
        source: "staff",
        deducted_sessions: 1,
        status: "checked_in",
        members: { name: "박서연", phone: "01098761234" },
        member_passes: { pass_name: "컨디셔닝 10회권", remaining_sessions: 3 }
      },
      {
        id: "demo-today-3",
        member_id: "demo-member-3",
        checkin_at: new Date(Date.now() - 76 * 60000).toISOString(),
        source: "staff",
        deducted_sessions: 0,
        status: "cancelled",
        members: { name: "이정훈", phone: "01055557777" },
        member_passes: { pass_name: "그룹 8회권", remaining_sessions: 1 }
      }
    ];
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("attendance_logs")
    .select("*, members(name, phone), member_passes(pass_name, remaining_sessions)")
    .eq("organization_id", organizationId)
    .eq("attendance_date", todayInKorea())
    .order("checkin_at", { ascending: false });

  if (error) {
    console.error("Failed to load today's attendance", {
      organizationId,
      code: error.code,
      message: error.message
    });
    return [];
  }

  return data ?? [];
}

export async function getAttendanceByMember(memberId: string, organizationId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("attendance_logs")
    .select("*, member_passes(pass_name)")
    .eq("organization_id", organizationId)
    .eq("member_id", memberId)
    .order("checkin_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function hasCheckedInToday(memberId: string, memberPassId: string, organizationId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("attendance_logs")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("member_id", memberId)
    .eq("member_pass_id", memberPassId)
    .eq("attendance_date", todayInKorea())
    .eq("status", "checked_in")
    .maybeSingle();

  if (error) throw new Error(error.message);
  return Boolean(data);
}
