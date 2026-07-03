import { MonitorSmartphone, UserRoundCheck } from "lucide-react";
import { Card } from "@/components/ui/card";

export function AttendanceSourceSplit({ staff, kiosk }: { staff: number; kiosk: number }) {
  const total = staff + kiosk;
  const kioskRate = total > 0 ? Math.round((kiosk / total) * 100) : 0;
  const staffRate = total > 0 ? 100 - kioskRate : 0;

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-bold text-ink">출석 처리 출처</h2>
          <p className="mt-1 text-sm text-muted">오늘 체크인이 키오스크와 직원 처리 중 어디서 발생했는지 확인합니다.</p>
        </div>
        <div className="rounded-md bg-brand-soft px-3 py-1 text-sm font-bold text-brand-dark">{total}건</div>
      </div>
      <div className="mt-5 h-3 overflow-hidden rounded-full bg-surface">
        <div className="h-full rounded-full bg-brand" style={{ width: `${kioskRate}%` }} />
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-md border border-line bg-surface p-4">
          <div className="flex items-center gap-2 text-sm font-bold text-brand-dark">
            <MonitorSmartphone className="size-4" />
            키오스크
          </div>
          <div className="mt-2 text-2xl font-black">{kiosk}건</div>
          <div className="text-sm text-muted">{kioskRate}%</div>
        </div>
        <div className="rounded-md border border-line bg-surface p-4">
          <div className="flex items-center gap-2 text-sm font-bold text-action">
            <UserRoundCheck className="size-4" />
            직원 처리
          </div>
          <div className="mt-2 text-2xl font-black">{staff}건</div>
          <div className="text-sm text-muted">{staffRate}%</div>
        </div>
      </div>
    </Card>
  );
}
