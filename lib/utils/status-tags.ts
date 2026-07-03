import type { Member, MemberPass } from "@/lib/types";
import { daysSince } from "./format-date";

export function getMemberStatusTags(member: Pick<Member, "last_visit_date">, pass?: Pick<MemberPass, "remaining_sessions"> | null) {
  const tags: string[] = [];

  if (pass && pass.remaining_sessions <= 3 && pass.remaining_sessions > 0) tags.push("재등록 대상");
  if (pass && pass.remaining_sessions === 0) tags.push("소진");

  const inactiveDays = daysSince(member.last_visit_date);
  if (inactiveDays >= 30) tags.push("고위험");
  else if (inactiveDays >= 14) tags.push("14일 이상 미방문");

  return tags;
}
