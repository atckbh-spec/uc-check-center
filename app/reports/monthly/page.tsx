import { BarChart3, CalendarDays, SlidersHorizontal } from "lucide-react";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/PageHeader";
import { StaffOnlyLayout } from "@/components/layout/StaffOnlyLayout";
import { requireStaffUser } from "@/lib/auth/require-staff";
import { getMonthlySummary } from "@/lib/reports/queries";

export const dynamic = "force-dynamic";

type ViewMode = "daily" | "weekly" | "source";

function StatCard({ label, value, detail }: { label: string; value: string | number; detail?: string }) {
  return (
    <Card className="p-5">
      <div className="text-sm font-semibold text-muted">{label}</div>
      <div className="mt-2 text-3xl font-bold text-ink">{value}</div>
      {detail ? <div className="mt-2 text-sm text-muted">{detail}</div> : null}
    </Card>
  );
}

function ChartRow({ label, value, max }: { label: string; value: number; max: number }) {
  return (
    <div className="grid grid-cols-[96px_1fr_48px] items-center gap-3 text-sm">
      <span className="truncate text-muted">{label}</span>
      <div className="h-5 overflow-hidden rounded bg-brand-soft">
        <div className="h-full rounded bg-brand" style={{ width: `${Math.max(4, Math.round((value / Math.max(1, max)) * 100))}%` }} />
      </div>
      <span className="text-right font-bold text-ink">{value}</span>
    </div>
  );
}

function getWeekKey(date: string) {
  const day = Number(date.slice(-2));
  return `${Math.ceil(day / 7)}주차`;
}

export default async function MonthlyReportPage({ searchParams }: { searchParams: { year?: string; month?: string; view?: ViewMode } }) {
  const staff = await requireStaffUser();
  const now = new Date();
  const year = Number(searchParams.year ?? now.getFullYear());
  const month = Number(searchParams.month ?? now.getMonth() + 1);
  const view = searchParams.view === "weekly" || searchParams.view === "source" ? searchParams.view : "daily";
  const rows = await getMonthlySummary(staff.organization_id, year, month);

  const checkedIn = rows.filter((row: any) => row.status === "checked_in");
  const cancelled = rows.filter((row: any) => row.status === "cancelled").length;
  const noShow = rows.filter((row: any) => row.status === "no_show").length;
  const uniqueMembers = new Set(checkedIn.map((row: any) => row.member_id)).size;
  const kiosk = checkedIn.filter((row: any) => row.source === "kiosk").length;
  const staffCount = checkedIn.filter((row: any) => row.source === "staff").length;
  const averageVisits = uniqueMembers > 0 ? (checkedIn.length / uniqueMembers).toFixed(1) : "0";
  const kioskRate = checkedIn.length > 0 ? Math.round((kiosk / checkedIn.length) * 100) : 0;

  const daily = checkedIn.reduce<Record<string, number>>((acc, row: any) => {
    acc[row.attendance_date] = (acc[row.attendance_date] ?? 0) + 1;
    return acc;
  }, {});
  const weekly = checkedIn.reduce<Record<string, number>>((acc, row: any) => {
    const key = getWeekKey(row.attendance_date);
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
  const source = {
    키오스크: kiosk,
    직원: staffCount
  };

  const chartMap = view === "weekly" ? weekly : view === "source" ? source : daily;
  const chartEntries = Object.entries(chartMap).sort(([a], [b]) => a.localeCompare(b, "ko-KR"));
  const maxCount = Math.max(1, ...chartEntries.map(([, count]) => count));
  const chartTitle = view === "weekly" ? "주별 출석 그래프" : view === "source" ? "출처별 출석 그래프" : "일별 출석 그래프";

  return (
    <StaffOnlyLayout>
      <PageHeader title="월간 리포트" description={`${year}.${String(month).padStart(2, "0")} 출석 요약과 그래프 설정`} />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <StatCard label="총 출석" value={checkedIn.length} />
        <StatCard label="고유 방문 회원" value={uniqueMembers} />
        <StatCard label="평균 방문 횟수" value={`${averageVisits}회`} />
        <StatCard label="키오스크 비율" value={`${kioskRate}%`} detail={`${kiosk}건`} />
        <StatCard label="노쇼" value={noShow} />
        <StatCard label="취소" value={cancelled} />
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[360px_1fr]">
        <Card className="h-fit p-5">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="size-5 text-brand-dark" />
            <h2 className="font-semibold">그래프 설정</h2>
          </div>
          <form className="mt-5 grid gap-3">
            <label>
              <span className="mb-1 block text-sm font-semibold">연도</span>
              <input name="year" type="number" defaultValue={year} className="focus-ring h-11 w-full rounded-md border border-line bg-white px-3" />
            </label>
            <label>
              <span className="mb-1 block text-sm font-semibold">월</span>
              <input name="month" type="number" min="1" max="12" defaultValue={month} className="focus-ring h-11 w-full rounded-md border border-line bg-white px-3" />
            </label>
            <label>
              <span className="mb-1 block text-sm font-semibold">보기 방식</span>
              <select name="view" defaultValue={view} className="focus-ring h-11 w-full rounded-md border border-line bg-white px-3">
                <option value="daily">일별 그래프</option>
                <option value="weekly">주별 그래프</option>
                <option value="source">출처별 그래프</option>
              </select>
            </label>
            <button type="submit" className="focus-ring mt-2 inline-flex h-12 items-center justify-center gap-2 rounded-md bg-brand px-4 text-sm font-bold text-white">
              <BarChart3 className="size-4" />
              그래프 적용
            </button>
          </form>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="font-semibold">{chartTitle}</h2>
              <p className="mt-1 text-sm text-muted">설정한 기준에 따라 출석 흐름을 비교합니다.</p>
            </div>
            <CalendarDays className="size-5 text-brand-dark" />
          </div>
          <div className="mt-6 grid gap-3">
            {chartEntries.map(([label, count]) => (
              <ChartRow key={label} label={label} value={count} max={maxCount} />
            ))}
            {chartEntries.length === 0 ? <p className="text-sm text-muted">이번 달 출석 기록이 없습니다.</p> : null}
          </div>
        </Card>
      </section>
    </StaffOnlyLayout>
  );
}
