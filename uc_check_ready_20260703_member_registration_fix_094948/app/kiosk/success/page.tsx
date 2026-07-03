import Link from "next/link";
import { CheckCircle2, Home, XCircle } from "lucide-react";
import { KioskAutoReturn } from "@/components/kiosk/KioskAutoReturn";
import { KioskShell } from "@/components/kiosk/KioskShell";
import { requireKioskAccess } from "@/lib/kiosk/access";

function getParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value ?? "";
}

type Props = {
  searchParams: {
    ok?: string | string[];
    name?: string | string[];
    pass?: string | string[];
    remaining?: string | string[];
    count?: string | string[];
    date?: string | string[];
    message?: string | string[];
  };
};

export const dynamic = "force-dynamic";

export default async function KioskSuccessPage({ searchParams }: Props) {
  await requireKioskAccess();
  const ok = getParam(searchParams.ok) === "true";
  const name = getParam(searchParams.name) || "회원";
  const pass = getParam(searchParams.pass);
  const remaining = getParam(searchParams.remaining) || "0";
  const message = getParam(searchParams.message);

  return (
    <KioskShell eyebrow={ok ? "Step 4 · 출석 완료" : "출석 처리 오류"}>
      <section className="w-full max-w-3xl rounded-md border border-white/70 bg-white/95 p-6 text-center shadow-subtle backdrop-blur sm:p-10">
        <div className={`mx-auto flex size-24 items-center justify-center rounded-full ${ok ? "bg-brand-soft text-brand-dark" : "bg-action/10 text-action"}`}>
          {ok ? <CheckCircle2 className="size-14" /> : <XCircle className="size-14" />}
        </div>

        <h1 className="mt-6 text-4xl font-black tracking-tight text-ink sm:text-6xl">
          {ok ? "출석 완료" : "출석 처리 실패"}
        </h1>
        <p className="mt-3 text-xl font-bold text-muted">{ok ? `${name}님, 오늘도 좋은 운동 되세요.` : message || "스태프에게 문의해 주세요."}</p>

        {ok ? (
          <div className="mx-auto mt-8 grid max-w-2xl gap-4 sm:grid-cols-2">
            <div className="rounded-md border border-line bg-surface p-6 text-left">
              <p className="text-sm font-bold text-muted">차감 회원권</p>
              <p className="mt-2 text-2xl font-black text-ink">{pass}</p>
              <p className="mt-4 text-sm font-semibold text-muted">1회 차감되었습니다.</p>
            </div>
            <div className="rounded-md bg-brand-dark p-6 text-center text-white">
              <p className="text-sm font-bold text-white/70">남은 횟수</p>
              <p className="mt-1 text-7xl font-black">{remaining}</p>
              <p className="text-sm font-bold text-white/70">회</p>
            </div>
          </div>
        ) : null}

        <Link
          href="/kiosk"
          className="focus-ring mt-8 inline-flex min-h-16 items-center justify-center gap-2 rounded-md bg-brand px-8 text-lg font-black text-white shadow-subtle hover:bg-brand-dark"
        >
          <Home className="size-5" />
          처음으로
        </Link>

        {ok ? <KioskAutoReturn seconds={5} /> : null}
      </section>
    </KioskShell>
  );
}
