import Link from "next/link";
import { BarChart3, CalendarCheck, Gauge, LogOut, Search, Settings, Users } from "lucide-react";
import { signOutStaff } from "@/lib/auth/actions";
import type { StaffUser } from "@/lib/types";
import { Button } from "@/components/ui/button";

const links = [
  { href: "/dashboard", label: "대시보드", icon: Gauge },
  { href: "/check-in", label: "빠른 출석", icon: Search },
  { href: "/members", label: "회원 관리", icon: Users },
  { href: "/attendance/today", label: "오늘 출석", icon: CalendarCheck },
  { href: "/reports/monthly", label: "월간 리포트", icon: BarChart3 },
  { href: "/settings/staff", label: "직원 설정", icon: Settings }
];

const roleLabel: Record<string, string> = {
  owner: "운영자",
  admin: "관리자",
  coach: "코치",
  front_desk: "프론트"
};

export function AppSidebar({ staff }: { staff: StaffUser }) {
  return (
    <aside className="hidden min-h-screen w-64 border-r border-line bg-white px-4 py-5 md:block">
      <div className="mb-8">
        <div className="text-lg font-bold text-brand-dark">UC Check</div>
        <div className="text-sm text-muted">Urban Conditioning</div>
      </div>
      <nav className="space-y-1">
        {links.map((link) => {
          const Icon = link.icon;
          return (
            <Link key={link.href} href={link.href} className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-ink hover:bg-brand-soft">
              <Icon className="size-4" />
              {link.label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-8 border-t border-line pt-4 text-sm">
        <div className="font-semibold">{staff.name}</div>
        <div className="mb-3 text-muted">{roleLabel[staff.role] ?? staff.role}</div>
        <form action={signOutStaff}>
          <Button variant="secondary" className="w-full">
            <LogOut className="size-4" />
            로그아웃
          </Button>
        </form>
      </div>
    </aside>
  );
}
