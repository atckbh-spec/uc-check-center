import { RotateCcw } from "lucide-react";
import { cancelAttendanceFromForm } from "@/lib/attendance/actions";
import type { AttendanceLog } from "@/lib/types";
import { formatKoreanDateTime } from "@/lib/utils/format-date";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const statusLabel: Record<string, string> = {
  checked_in: "출석 완료",
  cancelled: "취소",
  no_show: "노쇼",
  manual_adjustment: "수동 조정"
};

const sourceLabel: Record<string, string> = {
  kiosk: "키오스크",
  staff: "직원",
  system: "시스템"
};

function statusClass(status: string) {
  if (status === "checked_in") return "bg-brand-soft text-brand-dark";
  if (status === "no_show") return "bg-[#fff1e8] text-action";
  if (status === "cancelled") return "bg-gray-200 text-gray-600";
  return "bg-gray-100 text-gray-700";
}

export function MemberAttendanceHistoryPanel({
  memberId,
  attendanceLogs,
  canCancel
}: {
  memberId: string;
  attendanceLogs: AttendanceLog[];
  canCancel: boolean;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold text-ink">출석 · 노쇼 히스토리</h2>
          <p className="mt-1 text-sm text-muted">출석 완료, 취소, 노쇼 기록을 한 곳에서 확인합니다.</p>
        </div>
        <Badge className="bg-gray-100 text-gray-700">최근 {attendanceLogs.length}건</Badge>
      </div>

      <div className="mt-5 divide-y divide-line">
        {attendanceLogs.map((log) => (
          <div key={log.id} className="grid gap-3 py-4 lg:grid-cols-[1fr_320px] lg:items-center">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-ink">{formatKoreanDateTime(log.checkin_at)}</span>
                <Badge className={statusClass(log.status)}>{statusLabel[log.status] ?? log.status}</Badge>
                <Badge className="bg-gray-100 text-gray-700">{sourceLabel[log.source] ?? log.source}</Badge>
              </div>
              <div className="mt-1 text-sm text-muted">
                차감 {log.deducted_sessions}회{log.memo ? ` · ${log.memo}` : ""}
              </div>
            </div>
            {canCancel && log.status === "checked_in" ? (
              <form action={cancelAttendanceFromForm} className="flex items-center gap-2">
                <input type="hidden" name="attendance_id" value={log.id} />
                <input type="hidden" name="member_id" value={memberId} />
                <Input name="reason" minLength={2} placeholder="취소 사유" className="h-10" required />
                <Button type="submit" variant="secondary" className="h-10 shrink-0 px-3">
                  <RotateCcw className="size-4" />
                  취소
                </Button>
              </form>
            ) : null}
          </div>
        ))}
        {attendanceLogs.length === 0 ? <div className="py-5 text-sm text-muted">출석 기록이 없습니다.</div> : null}
      </div>
    </Card>
  );
}
