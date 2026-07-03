import Link from "next/link";
import { ArrowRight, ClipboardCheck, MessageSquareWarning } from "lucide-react";
import { Card } from "@/components/ui/card";

export function OperationsNote({ renewalCount, inactiveCount, noShowCount }: { renewalCount: number; inactiveCount: number; noShowCount: number }) {
  const mainMessage =
    renewalCount + inactiveCount + noShowCount > 0
      ? "오늘은 우선관리 대상을 확인하고 후속 조치가 필요합니다."
      : "오늘은 긴급 관리 신호가 안정적입니다.";

  return (
    <Card className="bg-brand-dark p-5 text-white">
      <div className="flex items-start gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-md bg-white/15">
          <MessageSquareWarning className="size-5" />
        </span>
        <div>
          <h2 className="text-lg font-black">운영 메모</h2>
          <p className="mt-2 text-sm leading-6 text-white/75">{mainMessage}</p>
        </div>
      </div>
      <div className="mt-5 grid gap-2 text-sm">
        <div className="flex items-center justify-between rounded-md bg-white/10 px-4 py-3">
          <span>재등록 안내</span>
          <strong>{renewalCount}명</strong>
        </div>
        <div className="flex items-center justify-between rounded-md bg-white/10 px-4 py-3">
          <span>장기 미방문</span>
          <strong>{inactiveCount}명</strong>
        </div>
        <div className="flex items-center justify-between rounded-md bg-white/10 px-4 py-3">
          <span>오늘 노쇼</span>
          <strong>{noShowCount}건</strong>
        </div>
      </div>
      <Link href="/attendance/today" className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-white hover:underline">
        오늘 출석 현황으로 이동
        <ArrowRight className="size-4" />
      </Link>
      <div className="mt-5 flex items-center gap-2 rounded-md bg-white/10 px-4 py-3 text-xs text-white/70">
        <ClipboardCheck className="size-4" />
        출석 취소와 잔여 횟수 수정은 감사 로그로 남습니다.
      </div>
    </Card>
  );
}
