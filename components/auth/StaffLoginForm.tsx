import { signInStaff } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export function StaffLoginForm({ hasError }: { hasError: boolean }) {
  return (
    <Card className="w-full max-w-md p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">UC Check</h1>
        <p className="text-sm text-muted">Urban Conditioning 관리자 PIN</p>
      </div>
      <form action={signInStaff} className="space-y-4">
        <label className="block">
          <span className="mb-1 block text-sm font-medium">관리자 PIN</span>
          <Input name="pin" inputMode="numeric" type="password" autoComplete="off" className="h-14 text-center text-2xl font-bold" required />
        </label>
        {hasError ? <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">PIN 번호를 다시 확인해 주세요.</p> : null}
        <Button className="h-12 w-full" type="submit">관리자 모드 열기</Button>
      </form>
    </Card>
  );
}
