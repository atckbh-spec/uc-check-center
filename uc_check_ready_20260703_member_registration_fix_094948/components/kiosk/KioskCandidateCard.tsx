import Link from "next/link";
import { CheckCircle2, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { KioskCandidate } from "@/lib/kiosk/queries";

export function KioskCandidateCard({ candidate }: { candidate: KioskCandidate }) {
  const canCheckIn = Boolean(candidate.activePass);

  return (
    <Card className="p-5 sm:p-6">
      <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex size-16 shrink-0 items-center justify-center rounded-md bg-brand-soft text-brand-dark">
            <UserRound className="size-8" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="text-2xl font-black text-ink sm:text-3xl">{candidate.maskedName}</div>
              <Badge className={canCheckIn ? "bg-brand-soft text-brand-dark" : "bg-gray-100 text-gray-700"}>
                {canCheckIn ? "출석 가능" : "문의 필요"}
              </Badge>
            </div>
            <div className="mt-2 text-lg font-semibold text-muted">{candidate.maskedPhone}</div>
            <div className="mt-3 text-lg font-bold text-ink">
              {candidate.activePass ? (
                <span>
                  {candidate.activePass.pass_name} · 잔여 {candidate.activePass.remaining_sessions}회
                </span>
              ) : (
                <span className="text-muted">출석 가능한 활성 회원권이 없습니다.</span>
              )}
            </div>
          </div>
        </div>
        {candidate.activePass ? (
          <Link
            className="inline-flex min-h-16 min-w-40 items-center justify-center gap-2 rounded-md bg-brand px-6 text-lg font-black text-white"
            href={`/kiosk/confirm?memberId=${candidate.id}&passId=${candidate.activePass.id}`}
          >
            <CheckCircle2 className="size-6" />
            본인 선택
          </Link>
        ) : (
          <div className="rounded-md bg-surface px-5 py-4 text-base font-bold text-muted">스태프에게 문의해 주세요.</div>
        )}
      </div>
    </Card>
  );
}
