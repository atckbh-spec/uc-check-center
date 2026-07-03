import {
  AlertTriangle,
  CalendarCheck2,
  Clock3,
  MonitorSmartphone,
  RefreshCcw,
  UserRoundCheck,
  Users
} from "lucide-react";
import { AttendanceSourceSplit } from "@/components/dashboard/AttendanceSourceSplit";
import { CommandMetricCard } from "@/components/dashboard/CommandMetricCard";
import { OperationsNote } from "@/components/dashboard/OperationsNote";
import { PriorityPanel } from "@/components/dashboard/PriorityPanel";
import { RecentAttendanceTimeline } from "@/components/dashboard/RecentAttendanceTimeline";
import { StaffCommandHero } from "@/components/dashboard/StaffCommandHero";
import { StaffOnlyLayout } from "@/components/layout/StaffOnlyLayout";
import { requireStaffUser } from "@/lib/auth/require-staff";
import { getDashboardMetrics } from "@/lib/reports/queries";
import { formatKoreanLongDate } from "@/lib/utils/format-date";

type RenewalCandidateRow = {
  id: string;
  pass_name: string;
  remaining_sessions: number;
  member_id: string;
  members?: { id?: string; name?: string | null; phone?: string | null; last_visit_date?: string | null } | null;
};

type InactiveMemberRow = {
  id: string;
  name: string;
  phone?: string | null;
  last_visit_date?: string | null;
};

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const staff = await requireStaffUser();
  const metrics = await getDashboardMetrics(staff.organization_id);

  const renewalItems = (metrics.renewalCandidateList as RenewalCandidateRow[]).map((pass) => ({
    id: pass.members?.id ?? pass.member_id,
    name: pass.members?.name ?? "회원",
    phone: pass.members?.phone,
    last_visit_date: pass.members?.last_visit_date,
    passName: pass.pass_name,
    remainingSessions: pass.remaining_sessions
  }));

  const inactiveItems = (metrics.inactiveMemberList as InactiveMemberRow[]).map((member) => ({
    id: member.id,
    name: member.name,
    phone: member.phone,
    last_visit_date: member.last_visit_date
  }));

  return (
    <StaffOnlyLayout>
      <div className="space-y-6">
        <StaffCommandHero staff={staff} todayLabel={formatKoreanLongDate()} />

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <CommandMetricCard
            label="오늘 출석"
            value={metrics.todayAttendance}
            detail={`키오스크 ${metrics.sourceCounts.kiosk} · 직원 ${metrics.sourceCounts.staff}`}
            icon={CalendarCheck2}
            tone="dark"
            href="/attendance/today"
          />
          <CommandMetricCard
            label="활성 회원"
            value={metrics.activeMembers}
            detail="현재 관리 대상"
            icon={Users}
            href="/members"
          />
          <CommandMetricCard
            label="재등록 대상"
            value={metrics.renewalCandidates}
            detail="잔여 1~3회"
            icon={RefreshCcw}
            tone="attention"
            href="/members"
          />
          <CommandMetricCard
            label="14일 미방문"
            value={metrics.inactiveMembers}
            detail="상담 우선순위"
            icon={Clock3}
            tone="calm"
            href="/members"
          />
          <CommandMetricCard
            label="이번 달 출석"
            value={metrics.monthAttendance}
            detail={`오늘 노쇼 ${metrics.todayNoShows}건`}
            icon={MonitorSmartphone}
            href="/reports/monthly"
          />
        </section>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_390px]">
          <RecentAttendanceTimeline rows={metrics.recentAttendance as any[]} />
          <div className="grid content-start gap-6">
            <AttendanceSourceSplit staff={metrics.sourceCounts.staff} kiosk={metrics.sourceCounts.kiosk} />
            <OperationsNote renewalCount={metrics.renewalCandidates} inactiveCount={metrics.inactiveMembers} noShowCount={metrics.todayNoShows} />
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <PriorityPanel
            title="우선 관리 · 재등록"
            count={metrics.renewalCandidates}
            description="잔여 횟수 1~3회 회원입니다. 다음 세션 전 안내가 필요합니다."
            icon={AlertTriangle}
            items={renewalItems}
            emptyText="재등록 안내 대상이 없습니다."
            type="renewal"
          />
          <PriorityPanel
            title="우선 관리 · 장기 미방문"
            count={metrics.inactiveMembers}
            description="최근 14일 이상 방문하지 않은 활성 회원입니다."
            icon={UserRoundCheck}
            items={inactiveItems}
            emptyText="장기 미방문 회원이 없습니다."
            type="inactive"
          />
        </section>
      </div>
    </StaffOnlyLayout>
  );
}
