import Link from "next/link";
import { CheckCircle2, CircleDot } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { formatKoreanTime } from "@/lib/utils/format-date";
import { maskPhone } from "@/lib/utils/mask-phone";

type RecentAttendanceRow = {
  id: string;
  checkin_at: string;
  source: string;
  service_type?: string | null;
  members?: { id?: string; name?: string | null; phone?: string | null } | null;
  member_passes?: { pass_name?: string | null; remaining_sessions?: number | null } | null;
};

export function RecentAttendanceTimeline({ rows }: { rows: RecentAttendanceRow[] }) {
  return (
    <Card className="overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-line p-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-5 text-brand-dark" />
            <h2 className="text-xl font-black tracking-tight">최근 출석 타임라인</h2>
          </div>
          <p className="mt-1 text-sm text-muted">출석과 잔여 횟수 변동을 즉시 확인합니다.</p>
        </div>
        <Link href="/attendance/today" className="text-sm font-bold text-brand-dark hover:underline">
          전체 보기
        </Link>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-surface text-xs font-bold uppercase tracking-wide text-muted">
            <tr>
              <th className="px-5 py-4">시간</th>
              <th className="px-5 py-4">회원</th>
              <th className="px-5 py-4">회원권</th>
              <th className="px-5 py-4">출처</th>
              <th className="px-5 py-4">잔여</th>
              <th className="px-5 py-4">상태</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((row) => {
              const memberName = row.members?.name ?? "회원";
              const memberId = row.members?.id;
              const remaining = row.member_passes?.remaining_sessions;
              return (
                <tr key={row.id} className="bg-white transition hover:bg-brand-soft/50">
                  <td className="px-5 py-4 font-semibold text-ink">{formatKoreanTime(row.checkin_at)}</td>
                  <td className="px-5 py-4">
                    {memberId ? (
                      <Link href={`/members/${memberId}`} className="font-bold text-ink hover:text-brand-dark hover:underline">
                        {memberName}
                      </Link>
                    ) : (
                      <span className="font-bold text-ink">{memberName}</span>
                    )}
                    <div className="mt-0.5 text-xs text-muted">{maskPhone(row.members?.phone ?? "")}</div>
                  </td>
                  <td className="px-5 py-4 text-muted">{row.member_passes?.pass_name ?? row.service_type ?? "-"}</td>
                  <td className="px-5 py-4">
                    <span className="inline-flex items-center gap-2 font-semibold">
                      <CircleDot className={row.source === "kiosk" ? "size-3 fill-brand text-brand" : "size-3 fill-action text-action"} />
                      {row.source === "kiosk" ? "키오스크" : "직원"}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <Badge className={Number(remaining ?? 0) <= 3 ? "bg-[#fff1e8] text-action" : "bg-brand-soft text-brand-dark"}>
                      {remaining ?? "-"}회
                    </Badge>
                  </td>
                  <td className="px-5 py-4">
                    <Badge className="bg-[#e9f8ef] text-[#217345]">완료</Badge>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {rows.length === 0 ? <div className="p-8 text-center text-sm text-muted">아직 출석 기록이 없습니다.</div> : null}
      </div>
    </Card>
  );
}
