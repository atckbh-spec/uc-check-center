import { RotateCcw } from "lucide-react";
import { cancelAttendanceFromForm } from "@/lib/attendance/actions";
import { getTodayAttendance } from "@/lib/attendance/queries";
import { requireStaffUser } from "@/lib/auth/require-staff";
import { formatKoreanDateTime } from "@/lib/utils/format-date";
import { maskPhone } from "@/lib/utils/mask-phone";
import { StaffOnlyLayout } from "@/components/layout/StaffOnlyLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const dynamic = "force-dynamic";

const sourceLabel: Record<string, string> = {
  kiosk: "키오스크",
  staff: "직원",
  system: "시스템"
};

const statusLabel: Record<string, string> = {
  checked_in: "출석 완료",
  cancelled: "취소됨",
  no_show: "노쇼",
  manual_adjustment: "수동 조정"
};

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-line bg-white p-4">
      <div className="text-sm font-semibold text-muted">{label}</div>
      <div className="mt-2 text-3xl font-bold text-ink">{value}</div>
    </div>
  );
}

export default async function TodayAttendancePage() {
  const staff = await requireStaffUser();
  const logs = await getTodayAttendance(staff.organization_id);
  const rows = logs as any[];
  const canCancel = staff.role === "owner" || staff.role === "admin";

  const checkedIn = rows.filter((log) => log.status === "checked_in").length;
  const kiosk = rows.filter((log) => log.status === "checked_in" && log.source === "kiosk").length;
  const staffCount = rows.filter((log) => log.status === "checked_in" && log.source === "staff").length;
  const cancelled = rows.filter((log) => log.status === "cancelled").length;
  const noShow = rows.filter((log) => log.status === "no_show").length;

  return (
    <StaffOnlyLayout>
      <PageHeader title="오늘 출석" description="오늘 처리된 출석, 출처, 상태, 취소 내역을 확인합니다." />

      <section className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <SummaryCard label="완료 출석" value={checkedIn} />
        <SummaryCard label="키오스크" value={kiosk} />
        <SummaryCard label="직원 처리" value={staffCount} />
        <SummaryCard label="취소" value={cancelled} />
        <SummaryCard label="노쇼" value={noShow} />
      </section>

      <div className="overflow-x-auto rounded-md border border-line bg-white">
        <table className="w-full min-w-[1080px] text-left text-sm">
          <thead className="bg-surface text-muted">
            <tr>
              <th className="px-4 py-3">시간</th>
              <th className="px-4 py-3">회원</th>
              <th className="px-4 py-3">회원권</th>
              <th className="px-4 py-3">출처</th>
              <th className="px-4 py-3">차감</th>
              <th className="px-4 py-3">상태</th>
              <th className="px-4 py-3">처리자</th>
              {canCancel ? <th className="px-4 py-3">관리</th> : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((log) => {
              const isCancelled = log.status === "cancelled";
              return (
                <tr key={log.id} className={isCancelled ? "bg-surface/50 text-muted" : "hover:bg-surface"}>
                  <td className="px-4 py-3">{formatKoreanDateTime(log.checkin_at)}</td>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-ink">{log.members?.name ?? "-"}</div>
                    <div className="text-xs text-muted">{maskPhone(log.members?.phone ?? "")}</div>
                  </td>
                  <td className="px-4 py-3">{log.member_passes?.pass_name ?? "-"}</td>
                  <td className="px-4 py-3">
                    <Badge className={log.source === "kiosk" ? "bg-brand-soft text-brand-dark" : "bg-gray-100 text-gray-700"}>
                      {sourceLabel[log.source] ?? log.source}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">{log.deducted_sessions}회</td>
                  <td className="px-4 py-3">
                    <Badge className={isCancelled ? "bg-gray-200 text-gray-600" : "bg-[#e7f2f1] text-brand-dark"}>
                      {statusLabel[log.status] ?? log.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">{log.staff_users?.name ?? "키오스크"}</td>
                  {canCancel ? (
                    <td className="px-4 py-3">
                      {log.status === "checked_in" ? (
                        <form action={cancelAttendanceFromForm} className="flex min-w-[280px] items-center gap-2">
                          <input type="hidden" name="attendance_id" value={log.id} />
                          <input type="hidden" name="member_id" value={log.member_id ?? ""} />
                          <Input name="reason" minLength={2} placeholder="취소 사유" className="h-10" required />
                          <Button type="submit" variant="secondary" className="h-10 shrink-0 px-3">
                            <RotateCcw className="size-4" />
                            출석 취소
                          </Button>
                        </form>
                      ) : (
                        <span className="text-xs text-muted">처리 완료</span>
                      )}
                    </td>
                  ) : null}
                </tr>
              );
            })}
          </tbody>
        </table>
        {rows.length === 0 ? <div className="p-5 text-sm text-muted">오늘 출석 기록이 없습니다.</div> : null}
      </div>
    </StaffOnlyLayout>
  );
}
