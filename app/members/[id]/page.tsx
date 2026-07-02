import { AlertTriangle, CalendarDays, CheckCircle2, Clock, MessageSquareText, TrendingUp, UserCog } from "lucide-react";
import { checkInMemberAndRedirect } from "@/lib/attendance/actions";
import { requireStaffUser } from "@/lib/auth/require-staff";
import { getMemberDetail } from "@/lib/members/queries";
import { createMemberPass } from "@/lib/passes/actions";
import { assignMemberCoach } from "@/lib/staff/actions";
import { getAssignableStaff, getStaffUsers } from "@/lib/staff/queries";
import { addDaysInKorea, daysSince, todayInKorea } from "@/lib/utils/format-date";
import { maskPhone } from "@/lib/utils/mask-phone";
import { getRetentionRiskLabel, getRetentionRiskReasons, getRetentionRiskScore } from "@/lib/utils/retention-score";
import { AttendancePatternPanel } from "@/components/members/AttendancePatternPanel";
import { MemberAttendanceHistoryPanel } from "@/components/members/MemberAttendanceHistoryPanel";
import { MemberNotesPanel } from "@/components/members/MemberNotesPanel";
import { MemberPassRetentionCard } from "@/components/members/MemberPassRetentionCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/layout/PageHeader";
import { StaffOnlyLayout } from "@/components/layout/StaffOnlyLayout";

export const dynamic = "force-dynamic";

const roleLabel: Record<string, string> = {
  owner: "운영자",
  admin: "관리자",
  coach: "코치",
  front_desk: "프론트"
};

function estimateRunoutDate(remaining: number, visitsLast30: number) {
  if (!remaining || visitsLast30 <= 0) return "-";
  const daysPerVisit = 30 / visitsLast30;
  return addDaysInKorea(todayInKorea(), Math.ceil(remaining * daysPerVisit));
}

function StatCard({ label, value, icon: Icon, detail }: { label: string; value: string | number; icon: any; detail?: string }) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold text-muted">{label}</div>
        <Icon className="size-5 text-brand-dark" />
      </div>
      <div className="mt-3 text-3xl font-bold text-ink">{value}</div>
      {detail ? <div className="mt-2 text-sm text-muted">{detail}</div> : null}
    </Card>
  );
}

export default async function MemberDetailPage({ params }: { params: { id: string } }) {
  const staff = await requireStaffUser();
  const [member, staffUsers] = await Promise.all([
    getMemberDetail(params.id, staff.organization_id),
    getStaffUsers(staff.organization_id)
  ]);
  const assignableStaff = getAssignableStaff(staffUsers);
  const assignedStaff = staffUsers.find((item) => item.id === member.assigned_coach_id);
  const activePasses = member.member_passes.filter((pass) => pass.status === "active");
  const primaryPass = activePasses[0];
  const attendanceLogs = member.attendance_logs;
  const memberNotes = member.member_notes;
  const canAdminOps = staff.role === "owner" || staff.role === "admin";
  const canAssignCoach = canAdminOps;
  const canCreatePass = staff.role === "owner" || staff.role === "admin" || staff.role === "front_desk";

  const visitsLast30 = attendanceLogs.filter((log) => {
    const time = new Date(log.checkin_at).getTime();
    return log.status === "checked_in" && time >= Date.now() - 30 * 86400000;
  }).length;
  const noShowsLast30 = attendanceLogs.filter((log) => {
    const time = new Date(log.checkin_at).getTime();
    return log.status === "no_show" && time >= Date.now() - 30 * 86400000;
  }).length;
  const inactiveDays = daysSince(member.last_visit_date);
  const isRenewal = Boolean(primaryPass && primaryPass.remaining_sessions > 0 && primaryPass.remaining_sessions <= 3);
  const isInactive = inactiveDays >= 14;
  const pinnedNotes = memberNotes.filter((note) => note.is_pinned).slice(0, 2);
  const riskScore = getRetentionRiskScore(member, activePasses, attendanceLogs);
  const riskLabel = getRetentionRiskLabel(riskScore);
  const riskReasons = getRetentionRiskReasons(member, activePasses, attendanceLogs);

  return (
    <StaffOnlyLayout>
      <PageHeader
        title={member.name}
        description={`${maskPhone(member.phone)} · ${member.status === "active" ? "활성 회원" : member.status}`}
        actions={
          primaryPass ? (
            <form action={checkInMemberAndRedirect}>
              <input type="hidden" name="member_id" value={member.id} />
              <input type="hidden" name="member_pass_id" value={primaryPass.id} />
              <Button type="submit" className="h-12 px-6 text-base font-bold" disabled={primaryPass.remaining_sessions <= 0}>
                <CheckCircle2 className="size-5" />
                출석 체크
              </Button>
            </form>
          ) : null
        }
      />

      <div className="mb-5 flex flex-wrap gap-2">
        {assignedStaff ? (
          <Badge className="bg-brand-soft text-brand-dark">
            <UserCog className="mr-1 size-3" />
            담당 {assignedStaff.name}
          </Badge>
        ) : (
          <Badge className="bg-gray-100 text-gray-700">담당 미지정</Badge>
        )}
        {isRenewal ? (
          <Badge className="bg-[#fff1e8] text-action">
            <AlertTriangle className="mr-1 size-3" />
            재등록 안내
          </Badge>
        ) : null}
        {isInactive ? (
          <Badge className="bg-gray-100 text-gray-700">
            <Clock className="mr-1 size-3" />
            장기 미방문
          </Badge>
        ) : null}
        {pinnedNotes.length > 0 ? (
          <Badge className="bg-brand text-white">
            <MessageSquareText className="mr-1 size-3" />
            고정 메모 {pinnedNotes.length}개
          </Badge>
        ) : null}
      </div>

      {pinnedNotes.length > 0 ? (
        <Card className="mb-5 border-brand/30 bg-brand-soft p-4">
          <div className="mb-2 text-sm font-bold text-brand-dark">고정 메모</div>
          <div className="space-y-2">
            {pinnedNotes.map((note) => (
              <p key={note.id} className="text-sm leading-6 text-ink">{note.content}</p>
            ))}
          </div>
        </Card>
      ) : null}

      <section className="grid gap-4 md:grid-cols-4">
        <StatCard label="최근 30일 출석" value={`${visitsLast30}회`} icon={CalendarDays} detail="출석 완료 기준" />
        <StatCard label="활성 회원권" value={primaryPass?.pass_name ?? "-"} icon={TrendingUp} detail={activePasses.length > 1 ? `${activePasses.length}개 보유` : "대표 회원권"} />
        <StatCard label="잔여 횟수" value={primaryPass ? `${primaryPass.remaining_sessions}회` : "-"} icon={CheckCircle2} detail={isRenewal ? "재등록 안내 필요" : "정상"} />
        <StatCard label="최근 30일 노쇼" value={`${noShowsLast30}회`} icon={Clock} detail={primaryPass ? `예상 소진일 ${estimateRunoutDate(primaryPass.remaining_sessions, visitsLast30)}` : "활성 회원권 없음"} />
      </section>

      <Card className="mt-6 p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="font-semibold">리텐션 상태</h2>
            <p className="mt-1 text-sm text-muted">잔여 횟수, 미방문 기간, 최근 방문 빈도, 노쇼를 기준으로 계산합니다.</p>
          </div>
          <div className="flex items-center gap-3">
            <Badge className={riskScore >= 45 ? "bg-[#fff1e8] text-action" : "bg-brand-soft text-brand-dark"}>{riskLabel}</Badge>
            <div className="text-3xl font-bold text-ink">{riskScore}</div>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {riskReasons.length > 0 ? riskReasons.map((reason) => <Badge key={reason} className="bg-gray-100 text-gray-700">{reason}</Badge>) : <Badge className="bg-brand-soft text-brand-dark">특이사항 없음</Badge>}
        </div>
      </Card>

      <section className="mt-6 grid gap-5 lg:grid-cols-[1fr_380px]">
        <div className="space-y-5">
          <div className="space-y-4">
            {activePasses.map((pass) => (
              <MemberPassRetentionCard key={pass.id} memberId={member.id} pass={pass} canAdjust={canAdminOps} />
            ))}
            {activePasses.length === 0 ? (
              <Card className="p-5">
                <h2 className="font-semibold text-ink">회원권</h2>
                <p className="mt-2 text-sm text-muted">활성 회원권이 없습니다. 신규 회원권을 추가해야 출석 체크가 가능합니다.</p>
              </Card>
            ) : null}
          </div>

          <AttendancePatternPanel attendanceLogs={attendanceLogs} />
          <MemberAttendanceHistoryPanel memberId={member.id} attendanceLogs={attendanceLogs} canCancel={canAdminOps} />
          <MemberNotesPanel memberId={member.id} notes={memberNotes} staffUsers={staffUsers} />
        </div>

        <div className="space-y-5">
          <Card className="p-5">
            <h2 className="mb-4 font-semibold">담당 직원 설정</h2>
            {canAssignCoach ? (
              <form action={assignMemberCoach.bind(null, member.id)} className="space-y-3">
                <select name="assigned_coach_id" defaultValue={member.assigned_coach_id ?? ""} className="focus-ring h-11 w-full rounded-md border border-line bg-white px-3">
                  <option value="">담당 미지정</option>
                  {assignableStaff.map((item) => (
                    <option key={item.id} value={item.id}>{item.name} · {roleLabel[item.role]}</option>
                  ))}
                </select>
                <Button type="submit" className="w-full">담당 저장</Button>
              </form>
            ) : (
              <p className="rounded border border-line bg-surface p-3 text-sm text-muted">담당 직원 변경은 운영자와 관리자만 가능합니다.</p>
            )}
            <p className="mt-3 text-xs text-muted">활성 상태의 운영자, 관리자, 코치만 담당자로 지정할 수 있습니다.</p>
          </Card>

          <Card className="p-5">
            <h2 className="mb-4 font-semibold">회원권 추가</h2>
            {canCreatePass ? (
              <form action={createMemberPass.bind(null, member.id)} className="space-y-3">
                <Input name="pass_name" placeholder="PT 20회권" required />
                <Input name="total_sessions" type="number" min="1" placeholder="20" required />
                <select name="service_type" className="focus-ring h-11 w-full rounded-md border border-line bg-white px-3">
                  <option value="pt">PT</option>
                  <option value="conditioning">컨디셔닝</option>
                  <option value="group">그룹</option>
                  <option value="trial">체험</option>
                  <option value="other">기타</option>
                </select>
                <Input name="start_date" type="date" defaultValue={todayInKorea()} />
                <Input name="end_date" type="date" />
                <Button type="submit" className="w-full">회원권 추가</Button>
              </form>
            ) : (
              <p className="rounded border border-line bg-surface p-3 text-sm text-muted">회원권 추가는 운영자, 관리자, 프론트만 가능합니다.</p>
            )}
          </Card>

          <Card className="p-5">
            <h2 className="font-semibold text-ink">운영 체크리스트</h2>
            <div className="mt-4 space-y-3 text-sm text-muted">
              <p>1. 잔여 1~3회 회원은 재등록 상담 메모를 남깁니다.</p>
              <p>2. 노쇼는 잔여횟수 차감 없이 기록하고, 반복 시 주의 메모를 남깁니다.</p>
              <p>3. 잔여횟수 조정은 사유를 남기며 audit_logs에 저장됩니다.</p>
            </div>
          </Card>
        </div>
      </section>
    </StaffOnlyLayout>
  );
}
