import { AlertTriangle, CheckCircle2, ClipboardX, SlidersHorizontal } from "lucide-react";
import { checkInMemberAndRedirect, markNoShow } from "@/lib/attendance/actions";
import { adjustRemainingSessionsFromForm } from "@/lib/passes/actions";
import type { MemberPass } from "@/lib/types";
import { todayInKorea } from "@/lib/utils/format-date";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const serviceLabel: Record<string, string> = {
  pt: "PT",
  conditioning: "컨디셔닝",
  group: "그룹",
  trial: "체험",
  other: "기타"
};

export function MemberPassRetentionCard({
  memberId,
  pass,
  canAdjust
}: {
  memberId: string;
  pass: MemberPass;
  canAdjust: boolean;
}) {
  const usedRate = pass.total_sessions > 0 ? Math.round((pass.used_sessions / pass.total_sessions) * 100) : 0;
  const remainingRate = Math.max(0, Math.min(100, 100 - usedRate));
  const isRenewal = pass.remaining_sessions > 0 && pass.remaining_sessions <= 3;
  const isUsedUp = pass.remaining_sessions <= 0 || pass.status === "used_up";

  return (
    <Card className="overflow-hidden p-0">
      <div className="border-b border-line bg-white p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-xl font-bold text-ink">{pass.pass_name}</h3>
              <Badge className="bg-brand-soft text-brand-dark">{serviceLabel[pass.service_type] ?? pass.service_type}</Badge>
              {isRenewal ? <Badge className="bg-[#fff1e8] text-action">재등록 안내</Badge> : null}
              {isUsedUp ? <Badge className="bg-gray-200 text-gray-700">소진</Badge> : null}
            </div>
            <div className="mt-2 text-sm text-muted">
              시작 {pass.start_date} · {pass.end_date ? `종료 ${pass.end_date}` : "종료일 없음"}
            </div>
            <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
              <div className="rounded bg-surface p-3">
                <div className="text-muted">사용</div>
                <div className="mt-1 text-lg font-bold text-ink">{pass.used_sessions}회</div>
              </div>
              <div className="rounded bg-surface p-3">
                <div className="text-muted">잔여</div>
                <div className="mt-1 text-lg font-bold text-ink">{pass.remaining_sessions}회</div>
              </div>
              <div className="rounded bg-surface p-3">
                <div className="text-muted">전체</div>
                <div className="mt-1 text-lg font-bold text-ink">{pass.total_sessions}회</div>
              </div>
            </div>
          </div>

          <form action={checkInMemberAndRedirect}>
            <input type="hidden" name="member_id" value={memberId} />
            <input type="hidden" name="member_pass_id" value={pass.id} />
            <Button type="submit" disabled={isUsedUp} className="h-12 min-w-36 text-base font-bold">
              <CheckCircle2 className="size-5" />
              출석 체크
            </Button>
          </form>
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

      <div className="grid gap-0 divide-y divide-line bg-surface/40 lg:grid-cols-2 lg:divide-x lg:divide-y-0">
        <details className="group p-5">
          <summary className="flex cursor-pointer items-center justify-between text-sm font-bold text-ink">
            <span className="inline-flex items-center gap-2">
              <ClipboardX className="size-4 text-action" />
              노쇼 기록
            </span>
            <span className="text-xs text-muted group-open:hidden">열기</span>
          </summary>
          <form action={markNoShow} className="mt-4 space-y-3">
            <input type="hidden" name="member_id" value={memberId} />
            <input type="hidden" name="member_pass_id" value={pass.id} />
            <Input name="attendance_date" type="date" defaultValue={todayInKorea()} />
            <Input name="memo" placeholder="사유 예: 예약 시간 미도착" />
            <Button type="submit" variant="secondary" className="w-full">
              <ClipboardX className="size-4" />
              차감 없이 노쇼 기록
            </Button>
            <p className="text-xs text-muted">MVP 정책은 노쇼 시 잔여횟수를 차감하지 않습니다.</p>
          </form>
        </details>

        <details className="group p-5">
          <summary className="flex cursor-pointer items-center justify-between text-sm font-bold text-ink">
            <span className="inline-flex items-center gap-2">
              <SlidersHorizontal className="size-4 text-brand-dark" />
              잔여횟수 조정
            </span>
            <span className="text-xs text-muted group-open:hidden">관리자</span>
          </summary>
          {canAdjust ? (
            <form action={adjustRemainingSessionsFromForm} className="mt-4 space-y-3">
              <input type="hidden" name="member_id" value={memberId} />
              <input type="hidden" name="pass_id" value={pass.id} />
              <select name="amount" defaultValue="1" className="focus-ring h-11 w-full rounded-md border border-line bg-white px-3">
                <option value="1">+1회 복구</option>
                <option value="2">+2회 복구</option>
                <option value="3">+3회 복구</option>
                <option value="-1">-1회 차감</option>
                <option value="-2">-2회 차감</option>
                <option value="-3">-3회 차감</option>
              </select>
              <Input name="reason" minLength={2} placeholder="사유 예: 키오스크 오입력 복구" required />
              <Button type="submit" variant="secondary" className="w-full">
                <SlidersHorizontal className="size-4" />
                잔여횟수 조정 저장
              </Button>
              <p className="text-xs text-muted">조정 내역은 audit_logs에 저장됩니다.</p>
            </form>
          ) : (
            <div className="mt-4 rounded border border-line bg-white p-3 text-sm text-muted">
              <AlertTriangle className="mr-1 inline size-4" />
              잔여횟수 조정은 운영자와 관리자만 가능합니다.
            </div>
          )}
        </details>
      </div>
    </Card>
  );
}
