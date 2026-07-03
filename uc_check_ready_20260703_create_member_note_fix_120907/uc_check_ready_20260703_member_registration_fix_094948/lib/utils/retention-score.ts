import type { AttendanceLog, Member, MemberPass } from "@/lib/types";
import { daysSince } from "@/lib/utils/format-date";

export function getRetentionRiskScore(member: Member, activePasses: MemberPass[], attendanceLogs: Partial<AttendanceLog>[]) {
  const primaryPass = activePasses[0];
  const inactiveDays = daysSince(member.last_visit_date);
  const recentVisits = attendanceLogs.filter((log) => {
    if (log.status !== "checked_in" || !log.checkin_at) return false;
    return new Date(log.checkin_at).getTime() >= Date.now() - 30 * 86400000;
  }).length;
  const noShows = attendanceLogs.filter((log) => log.status === "no_show").length;

  let score = 0;
  if (primaryPass?.remaining_sessions === 0) score += 50;
  if (primaryPass && primaryPass.remaining_sessions >= 1 && primaryPass.remaining_sessions <= 3) score += 40;
  if (inactiveDays >= 30) score += 50;
  else if (inactiveDays >= 14) score += 30;
  if (recentVisits <= 1) score += 20;
  if (noShows >= 2) score += 30;

  return Math.min(100, score);
}

export function getRetentionRiskLabel(score: number) {
  if (score >= 70) return "고위험";
  if (score >= 45) return "상담 필요";
  if (score >= 20) return "관찰";
  return "정상";
}

export function getRetentionRiskReasons(member: Member, activePasses: MemberPass[], attendanceLogs: Partial<AttendanceLog>[]) {
  const primaryPass = activePasses[0];
  const inactiveDays = daysSince(member.last_visit_date);
  const recentVisits = attendanceLogs.filter((log) => {
    if (log.status !== "checked_in" || !log.checkin_at) return false;
    return new Date(log.checkin_at).getTime() >= Date.now() - 30 * 86400000;
  }).length;
  const noShows = attendanceLogs.filter((log) => log.status === "no_show").length;
  const reasons: string[] = [];

  if (primaryPass?.remaining_sessions === 0) reasons.push("잔여 횟수 없음");
  else if (primaryPass && primaryPass.remaining_sessions <= 3) reasons.push(`잔여 ${primaryPass.remaining_sessions}회`);
  if (inactiveDays >= 14) reasons.push(`${inactiveDays}일 미방문`);
  if (recentVisits <= 1) reasons.push("최근 30일 방문 1회 이하");
  if (noShows >= 2) reasons.push(`노쇼 ${noShows}회`);

  return reasons;
}
