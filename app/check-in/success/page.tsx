import Link from "next/link";
import { CheckCircle2, Home, RotateCcw } from "lucide-react";
import { StaffOnlyLayout } from "@/components/layout/StaffOnlyLayout";
import { Card } from "@/components/ui/card";
import { todayInKorea } from "@/lib/utils/format-date";

type Props = {
  searchParams: {
    ok?: string;
    name?: string;
    pass?: string;
    remaining?: string;
    count?: string;
    date?: string;
    message?: string;
  };
};

export const dynamic = "force-dynamic";

export default function StaffCheckInSuccessPage({ searchParams }: Props) {
  const ok = searchParams.ok === "true";
  const name = searchParams.name || "회원";
  const date = searchParams.date || todayInKorea();
  const count = searchParams.count || "-";

  return (
    <StaffOnlyLayout>
      <main className="flex min-h-[calc(100vh-48px)] items-center justify-center">
        <Card className="w-full max-w-2xl p-8 text-center">
          <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-brand-soft text-brand-dark">
            <CheckCircle2 className="size-9" />
          </div>
          <h1 className="mt-6 text-3xl font-bold text-ink">
            {ok ? `${name}님 ${date} ${count}회 출석입니다.` : "출석 처리에 실패했습니다."}
          </h1>
          <p className="mt-3 text-base text-muted">{searchParams.message || (ok ? "출석이 정상 처리되었습니다." : "회원권 상태나 중복 출석 여부를 확인해 주세요.")}</p>
          {ok ? (
            <div className="mt-6 rounded-md bg-surface p-4 text-sm text-muted">
              <div className="font-semibold text-ink">{searchParams.pass || "회원권"}</div>
              <div className="mt-1">차감 후 잔여 횟수 {searchParams.remaining || "-"}회</div>
            </div>
          ) : null}
          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/dashboard" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-brand px-5 text-sm font-semibold text-white">
              <Home className="size-4" />
              홈으로
            </Link>
            <Link href="/check-in" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md border border-line bg-white px-5 text-sm font-semibold text-ink">
              <RotateCcw className="size-4" />
              다시 출석
            </Link>
          </div>
        </Card>
      </main>
    </StaffOnlyLayout>
  );
}
