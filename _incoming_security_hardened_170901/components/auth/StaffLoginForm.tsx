import { signInStaff } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export function StaffLoginForm({ hasError }: { hasError: boolean }) {
  return (
    <Card className="w-full max-w-md p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">UC Check</h1>
        <p className="text-sm text-muted">Urban Conditioning Staff Login</p>
      </div>
      <form action={signInStaff} className="space-y-4">
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Email</span>
          <Input name="email" type="email" autoComplete="email" required />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Password</span>
          <Input name="password" type="password" autoComplete="current-password" required />
        </label>
        {hasError ? <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">로그인 정보를 확인해 주세요.</p> : null}
        <Button className="w-full" type="submit">Login</Button>
      </form>
    </Card>
  );
}
