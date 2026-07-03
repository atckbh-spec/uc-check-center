import { StaffLoginForm } from "@/components/auth/StaffLoginForm";

export default function LoginPage({ searchParams }: { searchParams: { error?: string } }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-surface p-4">
      <StaffLoginForm hasError={searchParams.error === "1"} />
    </main>
  );
}
