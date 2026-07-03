import { ShieldCheck } from "lucide-react";
import { signInStaff } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export function StaffLoginForm({ error }: { error?: string }) {
  const message =
    error === "no_staff"
      ? "활성 관리자 계정을 찾을 수 없습니다. 직원 설정 또는 Supabase staff_users를 확인해 주세요."
      : "PIN 번호가 올바르지 않습니다.";

  return (
    <Card className="w-full max-w-md p-8 text-center">
      <div className="mx-auto flex size-16 items-center justify-center rounded-md bg-brand-soft text-brand-dark">
        <ShieldCheck className="size-8" />
      </div>
      <div className="mt-6">
        <h1 className="text-3xl font-bold text-ink">관리자 모드</h1>
        <p className="mt-2 text-base text-muted">관리자 PIN을 입력하면 대시보드로 이동합니다.</p>
      </div>
      <form action={signInStaff} className="mt-7 space-y-4">
        <label className="block">
          <span className="sr-only">관리자 PIN</span>
          <Input name="pin" inputMode="numeric" type="password" placeholder="PIN" className="h-14 text-center text-2xl font-bold" required />
        </label>
        {error ? <p className="rounded-md bg-[#fff1e8] p-3 text-sm font-semibold text-action">{message}</p> : null}
        <Button className="h-14 w-full text-lg font-bold" type="submit">
          관리자 대시보드 열기
        </Button>
      </form>
    </Card>
  );
}
