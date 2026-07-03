import Link from "next/link";
import { ExternalLink, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function DashboardSearchBar() {
  return (
    <div className="mt-8 grid gap-3 lg:grid-cols-[1fr_auto_auto]">
      <form action="/members" className="flex min-h-14 items-center gap-3 rounded-md border border-line bg-white px-4 shadow-subtle">
        <Search className="size-5 shrink-0 text-muted" />
        <Input
          name="q"
          placeholder="회원명 또는 전화번호 끝 4자리"
          className="h-12 border-0 px-0 text-base shadow-none focus:ring-0 focus:ring-offset-0"
        />
        <Button type="submit" variant="secondary" className="shrink-0">
          회원 검색
        </Button>
      </form>
      <Link
        href="/check-in"
        className="inline-flex min-h-14 items-center justify-center rounded-md bg-brand px-5 text-sm font-bold text-white shadow-subtle transition hover:bg-brand-dark"
      >
        + 빠른 출석
      </Link>
      <Link
        href="/kiosk"
        className="inline-flex min-h-14 items-center justify-center gap-2 rounded-md bg-action px-5 text-sm font-bold text-white shadow-subtle transition hover:bg-[#b94e35]"
      >
        키오스크 열기
        <ExternalLink className="size-4" />
      </Link>
    </div>
  );
}
