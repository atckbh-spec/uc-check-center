import Link from "next/link";
import { RotateCcw } from "lucide-react";
import { KioskCandidateCard } from "@/components/kiosk/KioskCandidateCard";
import { KioskMessageCard } from "@/components/kiosk/KioskNotice";
import { KioskShell } from "@/components/kiosk/KioskShell";
import { requireKioskAccess } from "@/lib/kiosk/access";
import { getKioskSearchResultByLast4 } from "@/lib/kiosk/queries";

function getParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value ?? "";
}

export const dynamic = "force-dynamic";

export default async function KioskSearchPage({ searchParams }: { searchParams: { last4?: string | string[] } }) {
  await requireKioskAccess();
  const last4 = getParam(searchParams.last4);
  const result = await getKioskSearchResultByLast4(last4);

  return (
    <KioskShell eyebrow="Step 2 · 본인 선택">
      <section className="w-full max-w-4xl">
        <div className="rounded-md border border-white/70 bg-white/95 p-5 shadow-subtle backdrop-blur sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.2em] text-brand-dark">입력 번호 · {result.last4 || "----"}</p>
              <h1 className="mt-2 text-3xl font-black text-ink sm:text-4xl">아래에서 본인을 선택해 주세요</h1>
              <p className="mt-2 text-base font-medium text-muted">
                개인정보 보호를 위해 이름과 연락처는 일부만 표시합니다.
              </p>
            </div>
            <Link
              href="/kiosk"
              className="focus-ring inline-flex h-12 items-center justify-center gap-2 rounded-md border border-line bg-white px-5 text-sm font-black text-ink hover:bg-surface"
            >
              <RotateCcw className="size-4" />
              다시 입력
            </Link>
          </div>

          {result.tooMany ? (
            <div className="mt-5">
              <KioskMessageCard title="후보가 많습니다" message={result.message ?? "정확한 확인을 위해 스태프에게 문의해 주세요."} />
            </div>
          ) : null}

          {!result.isValid ? (
            <div className="mt-5">
              <KioskMessageCard title="입력값을 확인해 주세요" message={result.message ?? "전화번호 마지막 4자리를 정확히 입력해 주세요."} />
            </div>
          ) : null}

          {result.isValid && !result.tooMany && result.candidates.length === 0 ? (
            <div className="mt-5">
              <KioskMessageCard title="일치하는 회원이 없습니다" message="전화번호를 다시 입력하거나 스태프에게 문의해 주세요." />
            </div>
          ) : null}
        </div>

        {result.isValid && !result.tooMany && result.candidates.length > 0 ? (
          <div className="mt-5 grid gap-4">
            {result.candidates.map((candidate) => (
              <KioskCandidateCard key={candidate.id} candidate={candidate} />
            ))}
          </div>
        ) : null}
      </section>
    </KioskShell>
  );
}
