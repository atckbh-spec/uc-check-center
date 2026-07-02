import { BarChart3 } from "lucide-react";
import type { AttendanceLog } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

function buildBuckets(attendanceLogs: AttendanceLog[]) {
  const now = Date.now();
  const labels = ["4주 전", "3주 전", "2주 전", "최근 7일"];
  return labels.map((label, index) => {
    const start = now - (4 - index) * 7 * 86400000;
    const end = now - (3 - index) * 7 * 86400000;
    const visits = attendanceLogs.filter((log) => {
      const time = new Date(log.checkin_at).getTime();
      return log.status === "checked_in" && time >= start && time < end;
    }).length;
    const noShows = attendanceLogs.filter((log) => {
      const time = new Date(log.checkin_at).getTime();
      return log.status === "no_show" && time >= start && time < end;
    }).length;
    return { label, visits, noShows };
  });
}

export function AttendancePatternPanel({ attendanceLogs }: { attendanceLogs: AttendanceLog[] }) {
  const buckets = buildBuckets(attendanceLogs);
  const maxVisits = Math.max(1, ...buckets.map((bucket) => bucket.visits));

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold text-ink">최근 4주 출석 패턴</h2>
          <p className="mt-1 text-sm text-muted">방문 리듬이 떨어지는 시점을 빠르게 확인합니다.</p>
        </div>
        <BarChart3 className="size-5 text-brand-dark" />
      </div>
      <div className="mt-5 space-y-4">
        {buckets.map((bucket) => {
          const width = Math.max(8, Math.round((bucket.visits / maxVisits) * 100));
          return (
            <div key={bucket.label}>
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="font-semibold text-ink">{bucket.label}</span>
                <span className="text-muted">출석 {bucket.visits}회 · 노쇼 {bucket.noShows}회</span>
              </div>
              <div className="h-3 overflow-hidden rounded bg-brand-soft">
                <div className="h-full rounded bg-brand" style={{ width: `${width}%` }} />
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Badge className="bg-brand-soft text-brand-dark">출석 완료 기준</Badge>
        <Badge className="bg-[#fff1e8] text-action">노쇼 별도 표시</Badge>
      </div>
    </Card>
  );
}
