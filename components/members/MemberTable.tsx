import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { checkInMemberAndRedirect } from "@/lib/attendance/actions";
import { MemberStatusBadge } from "@/components/members/MemberStatusBadge";
import { maskPhone } from "@/lib/utils/mask-phone";
import { getMemberStatusTags } from "@/lib/utils/status-tags";
import { todayInKorea } from "@/lib/utils/format-date";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function MemberTable({ members }: { members: any[] }) {
  const today = todayInKorea();

  return (
    <div className="overflow-x-auto rounded-md border border-line bg-white">
      <table className="w-full min-w-[980px] text-left text-sm">
        <thead className="bg-surface text-muted">
          <tr>
            <th className="px-4 py-3">회원명</th>
            <th className="px-4 py-3">전화번호</th>
            <th className="px-4 py-3">활성 회원권</th>
            <th className="px-4 py-3">잔여</th>
            <th className="px-4 py-3">오늘 출석</th>
            <th className="px-4 py-3">최근 방문</th>
            <th className="px-4 py-3">상태</th>
            <th className="px-4 py-3">수기 처리</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {members.map((member) => {
            const activePasses = (member.member_passes ?? []).filter((pass: any) => pass.status === "active" && pass.remaining_sessions > 0);
            const activePass = activePasses[0];
            const todayLogs = (member.attendance_logs ?? []).filter((log: any) => log.attendance_date === today);
            const checkedInToday = todayLogs.some((log: any) => log.status === "checked_in");
            const tags = getMemberStatusTags(member, activePass);

            return (
              <tr key={member.id} className="hover:bg-surface">
                <td className="px-4 py-3 font-medium">
                  <Link href={`/members/${member.id}`} className="text-ink hover:text-brand-dark">
                    {member.name}
                  </Link>
                </td>
                <td className="px-4 py-3">{maskPhone(member.phone)}</td>
                <td className="px-4 py-3">{activePass?.pass_name ?? "-"}</td>
                <td className="px-4 py-3">{activePass ? `${activePass.remaining_sessions}회` : "-"}</td>
                <td className="px-4 py-3">
                  <Badge className={checkedInToday ? "bg-brand-soft text-brand-dark" : "bg-gray-100 text-gray-700"}>
                    {checkedInToday ? "출석 완료" : "미출석"}
                  </Badge>
                </td>
                <td className="px-4 py-3">{member.last_visit_date ?? "-"}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    <MemberStatusBadge status={member.status} />
                    {tags.map((tag) => (
                      <Badge key={tag} className="bg-brand-soft text-brand-dark">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3">
                  {activePass && !checkedInToday ? (
                    <form action={checkInMemberAndRedirect}>
                      <input type="hidden" name="member_id" value={member.id} />
                      <input type="hidden" name="member_pass_id" value={activePass.id} />
                      <Button type="submit" className="h-10 px-3">
                        <CheckCircle2 className="size-4" />
                        수기 출석
                      </Button>
                    </form>
                  ) : checkedInToday ? (
                    <span className="text-xs font-semibold text-brand-dark">오늘 처리 완료</span>
                  ) : (
                    <span className="text-xs text-muted">활성 회원권 없음</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {members.length === 0 ? <div className="p-4 text-sm text-muted">검색 결과가 없습니다.</div> : null}
    </div>
  );
}
