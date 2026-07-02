import Link from "next/link";
import { ShieldCheck } from "lucide-react";

export function KioskShell({ eyebrow, children }: { eyebrow?: string; children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-brand-soft px-4 py-5 sm:px-6 sm:py-8">
      <div className="mx-auto flex min-h-[calc(100vh-40px)] w-full max-w-6xl flex-col">
        <header className="flex items-center justify-between gap-4">
          <div>
            <div className="text-xl font-black text-brand-dark sm:text-2xl">Urban Conditioning</div>
            <div className="mt-1 text-sm font-bold text-muted">UC Check 현장 키오스크</div>
          </div>
          <div className="flex items-center gap-3">
            {eyebrow ? <div className="hidden rounded-md bg-white px-4 py-3 text-sm font-black text-brand-dark shadow-subtle sm:block">{eyebrow}</div> : null}
            <Link
              href="/kiosk/admin"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md border border-line bg-white px-4 text-sm font-bold text-ink shadow-subtle"
            >
              <ShieldCheck className="size-4" />
              관리자
            </Link>
          </div>
        </header>
        <div className="flex flex-1 items-center justify-center py-8">{children}</div>
      </div>
    </main>
  );
}
