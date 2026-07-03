import Link from "next/link";
import { CheckCircle2, RotateCcw } from "lucide-react";
import { cancelAttendanceFromForm, manualAttendanceFromForm } from "@/lib/attendance/actions";
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
      <table className="w-full min-w-[1160px] text-left text-sm">
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
            const checkedInLog = todayLogs.find((log: any) => log.status === "checked_in");
            const checkedInToday = Boolean(checkedInLog);
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
                  <div className="grid min-w-[330px] gap-2">
                    <form action={manualAttendanceFromForm} className="flex flex-wrap items-center gap-2">
                      <input type="hidden" name="member_id" value={member.id} />
                      <input type="hidden" name="member_pass_id" value={activePass?.id ?? ""} />
                      <input name="attendance_date" type="date" defaultValue={today} className="focus-ring h-10 rounded-md border border-line bg-white px-3 text-sm" />
                      <Button type="submit" className="h-10 px-3" disabled={!activePass}>
                        <CheckCircle2 className="size-4" />
                        추가 출석 처리
                      </Button>
                    </form>
                    <form action={cancelAttendanceFromForm} className="flex flex-wrap items-center gap-2">
                      <input type="hidden" name="attendance_id" value={checkedInLog?.id ?? ""} />
                      <input type="hidden" name="member_id" value={member.id} />
                      <input type="hidden" name="reason" value="수기 출석 취소" />
                      <Button type="submit" variant="secondary" className="h-10 px-3" disabled={!checkedInLog}>
                        <RotateCcw className="size-4" />
                        오늘 출석 취소
                      </Button>
                    </form>
                  </div>
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
