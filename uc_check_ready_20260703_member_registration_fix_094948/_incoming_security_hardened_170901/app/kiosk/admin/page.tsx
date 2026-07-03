import Link from "next/link";
import { ChevronLeft, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { enterAdminDashboard } from "@/lib/kiosk/access";

export const dynamic = "force-dynamic";

export default function KioskAdminPage({ searchParams }: { searchParams: { error?: string } }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-brand-soft px-5 py-8">
      <section className="w-full max-w-lg">
        <Link href="/kiosk" className="inline-flex min-h-12 items-center gap-2 rounded-md border border-line bg-white px-4 text-base font-semibold text-ink">
          <ChevronLeft className="size-5" />
          체크인으로 돌아가기
        </Link>

        <Card className="mt-6 p-8 text-center">
          <div className="mx-auto flex size-16 items-center justify-center rounded-md bg-brand-soft text-brand-dark">
            <ShieldCheck className="size-8" />
          </div>
          <h1 className="mt-6 text-3xl font-bold text-ink">관리자 PIN</h1>
          <p className="mt-3 text-base text-muted">직원용 PIN을 입력하면 관리자 대시보드로 이동합니다.</p>
          <form action={enterAdminDashboard} className="mt-7 space-y-4">
            <Input name="pin" inputMode="numeric" type="password" placeholder="PIN" className="h-14 text-center text-2xl font-bold" required />
            {searchParams.error === "1" ? <p className="rounded-md bg-[#fff1e8] p-3 text-sm font-semibold text-action">PIN이 올바르지 않습니다.</p> : null}
            <Button type="submit" className="h-14 w-full text-lg font-bold">관리자 대시보드 열기</Button>
          </form>
        </Card>
      </section>
    </main>
  );
}
