import { AlertTriangle, CalendarDays, CheckCircle2, Clock, RotateCcw, TrendingUp, UserCog } from "lucide-react";
import { cancelAttendanceFromForm, checkInMemberFromForm } from "@/lib/attendance/actions";
import { requireStaffUser } from "@/lib/auth/require-staff";
import { getMemberDetail } from "@/lib/members/queries";
import { createMemberPass } from "@/lib/passes/actions";
import { assignMemberCoach } from "@/lib/staff/actions";
import { getAssignableStaff, getStaffUsers } from "@/lib/staff/queries";
import { addDaysInKorea, daysSince, formatKoreanDateTime, todayInKorea } from "@/lib/utils/format-date";
import { maskPhone } from "@/lib/utils/mask-phone";
import { getRetentionRiskLabel, getRetentionRiskReasons, getRetentionRiskScore } from "@/lib/utils/retention-score";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/layout/PageHeader";
import { StaffOnlyLayout } from "@/components/layout/StaffOnlyLayout";

export const dynamic = "force-dynamic";

const statusLabel: Record<string, string> = {
  checked_in: "출석 완료",
  cancelled: "취소",
  no_show: "노쇼",
  manual_adjustment: "수동 조정"
};

const roleLabel: Record<string, string> = {
  owner: "운영자",
  admin: "관리자",
  coach: "코치",
  front_desk: "프론트"
};

const memberStatusLabel: Record<string, string> = {
  active: "활성 회원",
  inactive: "비활성 회원",
  paused: "일시정지",
  archived: "보관"
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
  const activePasses = (member.member_passes ?? []).filter((pass) => pass.status === "active");
  const checkablePasses = activePasses.filter((pass) => pass.remaining_sessions > 0);
  const primaryPass = checkablePasses[0] ?? activePasses[0];
  const attendanceLogs = (member.attendance_logs ?? []) as any[];
  const today = todayInKorea();
  const todayCheckedInLog = attendanceLogs.find((log) => log.attendance_date === today && log.status === "checked_in");
  const visitsLast30 = attendanceLogs.filter((log) => {
    const time = new Date(log.checkin_at).getTime();
    return log.status === "checked_in" && time >= Date.now() - 30 * 86400000;
  }).length;
  const inactiveDays = daysSince(member.last_visit_date);
  const isRenewal = Boolean(primaryPass && primaryPass.remaining_sessions > 0 && primaryPass.remaining_sessions <= 3);
  const isInactive = inactiveDays >= 14;
  const riskScore = getRetentionRiskScore(member, activePasses, attendanceLogs);
  const riskLabel = getRetentionRiskLabel(riskScore);
  const riskReasons = getRetentionRiskReasons(member, activePasses, attendanceLogs);

  return (
    <StaffOnlyLayout>
      <PageHeader
        title={member.name}
        description={`${maskPhone(member.phone)} · ${memberStatusLabel[member.status] ?? member.status}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <form action={checkInMemberFromForm}>
              <input type="hidden" name="member_id" value={member.id} />
              <input type="hidden" name="member_pass_id" value={primaryPass?.id ?? ""} />
              <Button type="submit" className="h-12 px-6 text-base font-bold" disabled={!primaryPass || primaryPass.remaining_sessions <= 0 || Boolean(todayCheckedInLog)}>
                <CheckCircle2 className="size-5" />
                수기 출석 처리
              </Button>
            </form>
            <form action={cancelAttendanceFromForm}>
              <input type="hidden" name="attendance_id" value={todayCheckedInLog?.id ?? ""} />
              <input type="hidden" name="member_id" value={member.id} />
              <input type="hidden" name="reason" value="수기 출석 취소" />
              <Button type="submit" variant="secondary" className="h-12 px-6 text-base font-bold" disabled={!todayCheckedInLog}>
                <RotateCcw className="size-5" />
                출석 취소
              </Button>
            </form>
          </div>
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
        {todayCheckedInLog ? <Badge className="bg-brand-soft text-brand-dark">오늘 출석 완료</Badge> : <Badge className="bg-gray-100 text-gray-700">오늘 미출석</Badge>}
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
      </div>

      <section className="grid gap-4 md:grid-cols-4">
        <StatCard label="최근 30일 출석" value={`${visitsLast30}회`} icon={CalendarDays} detail="출석 완료 기준" />
        <StatCard label="활성 회원권" value={primaryPass?.pass_name ?? "-"} icon={TrendingUp} detail={activePasses.length > 1 ? `${activePasses.length}개 보유` : "대표 회원권"} />
        <StatCard label="잔여 횟수" value={primaryPass ? `${primaryPass.remaining_sessions}회` : "-"} icon={CheckCircle2} detail={isRenewal ? "재등록 안내 필요" : "정상"} />
        <StatCard label="예상 소진일" value={primaryPass ? estimateRunoutDate(primaryPass.remaining_sessions, visitsLast30) : "-"} icon={Clock} detail="최근 30일 출석 기준" />
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
          {riskReasons.length > 0 ? (
            riskReasons.map((reason) => (
              <Badge key={reason} className="bg-gray-100 text-gray-700">
                {reason}
              </Badge>
            ))
          ) : (
            <Badge className="bg-brand-soft text-brand-dark">특이사항 없음</Badge>
          )}
        </div>
      </Card>

      <section className="mt-6 grid gap-5 lg:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          <Card className="p-5">
            <h2 className="mb-4 font-semibold">회원권</h2>
            <div className="grid gap-4">
              {activePasses.map((pass) => {
                const usedRate = pass.total_sessions > 0 ? Math.round((pass.used_sessions / pass.total_sessions) * 100) : 0;
                const remainingRate = Math.max(0, Math.min(100, 100 - usedRate));
                const passCheckedInLog = attendanceLogs.find((log) => log.attendance_date === today && log.status === "checked_in" && log.member_pass_id === pass.id);
                return (
                  <div key={pass.id} className="rounded-md border border-line p-5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="text-xl font-bold">{pass.pass_name}</div>
                          {passCheckedInLog ? <Badge className="bg-brand-soft text-brand-dark">오늘 출석 완료</Badge> : null}
                        </div>
                        <div className="mt-1 text-sm text-muted">
                          사용 {pass.used_sessions}회 · 잔여 {pass.remaining_sessions}회 · 전체 {pass.total_sessions}회
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <form action={checkInMemberFromForm}>
                          <input type="hidden" name="member_id" value={member.id} />
                          <input type="hidden" name="member_pass_id" value={pass.id} />
                          <Button type="submit" className="h-12 min-w-36 text-base font-bold" disabled={pass.remaining_sessions <= 0 || Boolean(todayCheckedInLog)}>
                            수기 출석 처리
                          </Button>
                        </form>
                        <form action={cancelAttendanceFromForm}>
                          <input type="hidden" name="attendance_id" value={passCheckedInLog?.id ?? ""} />
                          <input type="hidden" name="member_id" value={member.id} />
                          <input type="hidden" name="reason" value="수기 출석 취소" />
                          <Button type="submit" variant="secondary" className="h-12 min-w-28 text-base font-bold" disabled={!passCheckedInLog}>
                            출석 취소
                          </Button>
                        </form>
                      </div>
                    </div>
                    <div className="mt-5">
                      <div className="flex justify-between text-sm text-muted">
                        <span>사용률 {usedRate}%</span>
                        <span>잔여 {remainingRate}%</span>
                      </div>
                      <div className="mt-2 h-3 overflow-hidden rounded bg-brand-soft">
                        <div className="h-full rounded bg-brand" style={{ width: `${usedRate}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })}
              {activePasses.length === 0 ? <p className="text-sm text-muted">활성 회원권이 없습니다.</p> : null}
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="mb-4 font-semibold">출석 히스토리</h2>
            <div className="divide-y divide-line">
              {attendanceLogs.map((log) => (
                <div key={log.id} className="flex justify-between gap-4 py-3 text-sm">
                  <span>{formatKoreanDateTime(log.checkin_at)}</span>
                  <span className="text-muted">
                    {log.source === "kiosk" ? "키오스크" : "직원"} · {statusLabel[log.status] ?? log.status}
                  </span>
                </div>
              ))}
              {attendanceLogs.length === 0 ? <div className="py-3 text-sm text-muted">출석 기록이 없습니다.</div> : null}
            </div>
          </Card>
        </div>

        <div className="space-y-5">
          <Card className="p-5">
            <h2 className="mb-4 font-semibold">담당 직원 설정</h2>
            <form action={assignMemberCoach.bind(null, member.id)} className="space-y-3">
              <select name="assigned_coach_id" defaultValue={member.assigned_coach_id ?? ""} className="focus-ring h-11 w-full rounded-md border border-line bg-white px-3">
                <option value="">담당 미지정</option>
                {assignableStaff.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} · {roleLabel[item.role]}
                  </option>
                ))}
              </select>
              <Button type="submit" className="w-full">
                담당 저장
              </Button>
            </form>
            <p className="mt-3 text-xs text-muted">운영자, 관리자, 코치만 회원 담당자로 지정할 수 있습니다.</p>
          </Card>

          <Card className="p-5">
            <h2 className="mb-4 font-semibold">회원권 추가</h2>
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
              <Button type="submit" className="w-full">
                회원권 추가
              </Button>
            </form>
          </Card>
        </div>
      </section>
    </StaffOnlyLayout>
  );
}
