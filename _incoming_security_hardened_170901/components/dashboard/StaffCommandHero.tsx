import { CalendarDays, ShieldCheck } from "lucide-react";
import { DashboardSearchBar } from "@/components/dashboard/DashboardSearchBar";
import type { StaffUser } from "@/lib/types";

const roleLabel: Record<string, string> = {
  owner: "운영자",
  admin: "관리자",
  coach: "코치",
  front_desk: "프론트"
};

export function StaffCommandHero({ staff, todayLabel }: { staff: StaffUser; todayLabel: string }) {
  return (
    <section className="rounded-md border border-line bg-[linear-gradient(135deg,#ffffff_0%,#f7f8f6_52%,#e7f2f1_100%)] p-6 shadow-subtle lg:p-8">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-md bg-brand-soft px-3 py-1 text-sm font-bold text-brand-dark">
            <CalendarDays className="size-4" />
            {todayLabel}
          </div>
          <h1 className="mt-5 text-4xl font-black text-ink sm:text-5xl">오늘 운영 현황</h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-muted">
            출석 처리, 재등록 대상, 장기 미방문 회원을 한 화면에서 확인하고 바로 조치합니다.
          </p>
        </div>
        <div className="rounded-md border border-white/80 bg-white/80 p-4 shadow-subtle backdrop-blur">
          <div className="flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-md bg-brand-dark text-sm font-black text-white">
              {staff.name.slice(0, 1)}
            </span>
            <div>
              <div className="font-bold text-ink">{staff.name}</div>
              <div className="flex items-center gap-1.5 text-sm text-muted">
                <ShieldCheck className="size-3.5" />
                {roleLabel[staff.role] ?? staff.role}
              </div>
            </div>
          </div>
        </div>
      </div>
      <DashboardSearchBar />
    </section>
  );
}
