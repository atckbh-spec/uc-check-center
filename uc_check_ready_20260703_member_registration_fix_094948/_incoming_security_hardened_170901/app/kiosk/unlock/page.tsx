import { LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { unlockKiosk } from "@/lib/kiosk/access";

export const dynamic = "force-dynamic";

export default function KioskUnlockPage({ searchParams }: { searchParams: { error?: string } }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-brand-soft px-5 py-8">
      <Card className="w-full max-w-lg p-8 text-center">
        <div className="mx-auto flex size-16 items-center justify-center rounded-md bg-brand-soft text-brand-dark">
          <LockKeyhole className="size-8" />
        </div>
        <h1 className="mt-6 text-3xl font-bold text-ink">키오스크 잠금 해제</h1>
        <p className="mt-3 text-base text-muted">직원용 PIN을 입력해 태블릿 현장 모드를 시작해 주세요.</p>
        <form action={unlockKiosk} className="mt-7 space-y-4">
          <Input name="pin" inputMode="numeric" type="password" placeholder="PIN" className="h-14 text-center text-2xl font-bold" required />
          {searchParams.error === "1" ? <p className="rounded-md bg-[#fff1e8] p-3 text-sm font-semibold text-action">PIN이 올바르지 않습니다.</p> : null}
          <Button type="submit" className="h-14 w-full text-lg font-bold">키오스크 시작</Button>
        </form>
      </Card>
    </main>
  );
}
