import { BarChart3, CalendarDays, SlidersHorizontal } from "lucide-react";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/PageHeader";
import { StaffOnlyLayout } from "@/components/layout/StaffOnlyLayout";
import { requireStaffUser } from "@/lib/auth/require-staff";
import { getMonthlySummary } from "@/lib/reports/queries";

type ViewMode = "daily" | "weekly" | "source";
type PassCategory = "session" | "monthly" | "ot";

const passColors: Record<PassCategory, string> = {
  session: "#2f6f73",
  monthly: "#d95f3f",
  ot: "#205155"
};

const passLabels: Record<PassCategory, string> = {
  session: "회원권 출석",
  monthly: "한달권 출석",
  ot: "OT 출석"
};

type ChartEntry = {
  label: string;
  total: number;
  session: number;
  monthly: number;
  ot: number;
};

function StatCard({ label, value, detail }: { label: string; value: string | number; detail?: string }) {
  return (
    <Card className="p-5">
      <div className="text-sm font-semibold text-muted">{label}</div>
      <div className="mt-2 text-3xl font-bold text-ink">{value}</div>
      {detail ? <div className="mt-2 text-sm text-muted">{detail}</div> : null}
    </Card>
  );
}

function getWeekKey(date: string) {
  const day = Number(date.slice(-2));
  return `${Math.ceil(day / 7)}주차`;
}

function getPass(row: any) {
  return Array.isArray(row.member_passes) ? row.member_passes[0] : row.member_passes;
}

function getPassCategory(row: any): PassCategory {
  const pass = getPass(row);
  const name = String(pass?.pass_name ?? "").toLowerCase();
  const totalSessions = Number(pass?.total_sessions ?? 0);

  if (name.includes("ot") || name.includes("오티") || name.includes("체험") || name.includes("trial")) return "ot";
  if (name.includes("한달") || name.includes("1개월") || name.includes("월권") || name.includes("month") || totalSessions >= 900) return "monthly";
  return "session";
}

function addToEntry(entry: ChartEntry, category: PassCategory) {
  entry.total += 1;
  entry[category] += 1;
}

function makeEmptyEntry(label: string): ChartEntry {
  return { label, total: 0, session: 0, monthly: 0, ot: 0 };
}

function StackedBar({ entry, max, compact = false }: { entry: ChartEntry; max: number; compact?: boolean }) {
  const barHeight = entry.total > 0 ? Math.max(compact ? 20 : 8, Math.round((entry.total / max) * (compact ? 180 : 220))) : 0;
  const segments: PassCategory[] = ["ot", "monthly", "session"];

  return (
    <div className="flex h-full items-end justify-center">
      <div className={compact ? "flex w-16 flex-col justify-end overflow-hidden rounded-t-md bg-surface" : "flex w-full max-w-8 flex-col justify-end overflow-hidden rounded-t-md bg-surface"} style={{ height: `${barHeight}px` }}>
        {entry.total > 0
          ? segments.map((segment) => {
              const count = entry[segment];
              if (count === 0) return null;
              return (
                <div
                  key={segment}
                  title={`${entry.label} ${passLabels[segment]} ${count}회`}
                  style={{
                    height: `${Math.max(10, Math.round((count / entry.total) * barHeight))}px`,
                    backgroundColor: passColors[segment]
                  }}
                />
              );
            })
          : null}
      </div>
    </div>
  );
}

function DailyStackedBars({ entries }: { entries: ChartEntry[] }) {
  const max = Math.max(1, ...entries.map((entry) => entry.total));

  return (
    <div className="overflow-x-auto">
      <div className="flex min-w-[980px] items-end gap-2 pt-6">
        {entries.map((entry) => (
          <div key={entry.label} className="flex flex-1 min-w-7 flex-col items-center gap-2">
            <div className="h-56 w-full">
              <StackedBar entry={entry} max={max} />
            </div>
            <div className="h-5 text-xs font-semibold text-ink">{entry.total || ""}</div>
            <div className="text-[11px] text-muted">{entry.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function GroupedStackedBars({ entries }: { entries: ChartEntry[] }) {
  const max = Math.max(1, ...entries.map((entry) => entry.total));

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {entries.map((entry) => (
        <div key={entry.label} className="rounded-md border border-line bg-white p-4">
          <div className="h-48">
            <StackedBar entry={entry} max={max} compact />
          </div>
          <div className="mt-3 text-center text-sm font-bold text-ink">{entry.label}</div>
          <div className="text-center text-2xl font-black text-brand-dark">{entry.total}</div>
        </div>
      ))}
    </div>
  );
}

export const dynamic = "force-dynamic";

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
  const averageVisits = uniqueMembers > 0 ? (checkedIn.length / uniqueMembers).toFixed(1) : "0";

  const daysInMonth = new Date(year, month, 0).getDate();
  const dailyEntries = Array.from({ length: daysInMonth }, (_, index) => makeEmptyEntry(String(index + 1)));

  checkedIn.forEach((row: any) => {
    const day = Number(String(row.attendance_date).slice(-2));
    const entry = dailyEntries[day - 1];
    if (entry) addToEntry(entry, getPassCategory(row));
  });

  const weeklyMap = checkedIn.reduce<Record<string, ChartEntry>>((acc, row: any) => {
    const key = getWeekKey(row.attendance_date);
    acc[key] ??= makeEmptyEntry(key);
    addToEntry(acc[key], getPassCategory(row));
    return acc;
  }, {});

  const sourceMap = checkedIn.reduce<Record<string, ChartEntry>>((acc, row: any) => {
    const key = row.source === "kiosk" ? "키오스크" : row.source === "staff" ? "직원 처리" : "시스템";
    acc[key] ??= makeEmptyEntry(key);
    addToEntry(acc[key], getPassCategory(row));
    return acc;
  }, {});

  const chartEntries =
    view === "weekly"
      ? Object.values(weeklyMap).sort((a, b) => a.label.localeCompare(b.label, "ko-KR"))
      : view === "source"
        ? Object.values(sourceMap).sort((a, b) => a.label.localeCompare(b.label, "ko-KR"))
        : dailyEntries;

  const sessionCount = checkedIn.filter((row: any) => getPassCategory(row) === "session").length;
  const monthlyCount = checkedIn.filter((row: any) => getPassCategory(row) === "monthly").length;
  const otCount = checkedIn.filter((row: any) => getPassCategory(row) === "ot").length;
  const chartTitle = view === "weekly" ? "주별 출석 그래프" : view === "source" ? "출처별 출석 그래프" : "일별 출석 그래프";

  return (
    <StaffOnlyLayout>
      <PageHeader title="월간 리포트" description={`${year}.${String(month).padStart(2, "0")} 출석 요약과 회원권별 그래프`} />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <StatCard label="총 출석" value={checkedIn.length} />
        <StatCard label="회원권 출석" value={sessionCount} detail="10회권, 20회권 등" />
        <StatCard label="한달권 출석" value={monthlyCount} />
        <StatCard label="OT 출석" value={otCount} detail="OT, 체험권" />
        <StatCard label="고유 방문 회원" value={uniqueMembers} detail={`평균 ${averageVisits}회`} />
        <StatCard label="노쇼 / 취소" value={`${noShow} / ${cancelled}`} detail={`키오스크 ${kiosk}건`} />
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

          <div className="mt-6 rounded-md bg-surface p-4">
            <div className="text-sm font-bold text-ink">색상 구분</div>
            <div className="mt-3 grid gap-2 text-sm">
              {(["session", "monthly", "ot"] as PassCategory[]).map((category) => (
                <div key={category} className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-2">
                    <span className="size-3 rounded-sm" style={{ backgroundColor: passColors[category] }} />
                    {passLabels[category]}
                  </span>
                  <strong>{category === "session" ? sessionCount : category === "monthly" ? monthlyCount : otCount}회</strong>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="font-semibold">{chartTitle}</h2>
              <p className="mt-1 text-sm text-muted">회원권 출석, 한달권 출석, OT 출석을 색상으로 나눠 보여줍니다.</p>
            </div>
            <CalendarDays className="size-5 text-brand-dark" />
          </div>

          <div className="mt-5 flex flex-wrap gap-3 text-sm">
            {(["session", "monthly", "ot"] as PassCategory[]).map((category) => (
              <span key={category} className="inline-flex items-center gap-2 rounded-md border border-line bg-white px-3 py-2 font-semibold text-ink">
                <span className="size-3 rounded-sm" style={{ backgroundColor: passColors[category] }} />
                {passLabels[category]}
              </span>
            ))}
          </div>

          <div className="mt-6">
            {view === "daily" ? <DailyStackedBars entries={chartEntries} /> : <GroupedStackedBars entries={chartEntries} />}
            {checkedIn.length === 0 ? <p className="mt-6 text-sm text-muted">이번 달 출석 기록이 없습니다.</p> : null}
          </div>
        </Card>
      </section>
    </StaffOnlyLayout>
  );
}
