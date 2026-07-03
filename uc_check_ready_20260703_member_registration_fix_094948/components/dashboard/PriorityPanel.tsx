import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils/cn";
import { daysSince } from "@/lib/utils/format-date";
import { maskPhone } from "@/lib/utils/mask-phone";

type PriorityMember = {
  id: string;
  name: string;
  phone?: string | null;
  last_visit_date?: string | null;
  passName?: string | null;
  remainingSessions?: number | null;
};

type PriorityPanelProps = {
  title: string;
  count: number;
  description: string;
  icon: LucideIcon;
  items: PriorityMember[];
  emptyText: string;
  type: "renewal" | "inactive";
};

function InitialBadge({ name }: { name: string }) {
  return <span className="flex size-11 shrink-0 items-center justify-center rounded-md bg-brand-soft text-base font-black text-brand-dark">{name.slice(0, 1)}</span>;
}

export function PriorityPanel({ title, count, description, icon: Icon, items, emptyText, type }: PriorityPanelProps) {
  return (
    <Card className="overflow-hidden">
      <div className="flex items-start justify-between gap-4 border-b border-line p-5">
        <div>
          <div className="flex items-center gap-2">
            <Icon className={cn("size-5", type === "renewal" ? "text-action" : "text-brand-dark")} />
            <h2 className="text-xl font-black tracking-tight">{title}</h2>
          </div>
          <p className="mt-1 text-sm text-muted">{description}</p>
        </div>
        <Badge className={type === "renewal" ? "rounded-full bg-[#fff1e8] px-3 py-1 text-action" : "rounded-full bg-surface px-3 py-1 text-muted"}>{count}명</Badge>
      </div>
      <div className="divide-y divide-line">
        {items.map((item) => (
          <Link key={item.id} href={`/members/${item.id}`} className="flex items-center gap-3 p-4 transition hover:bg-surface">
            <InitialBadge name={item.name} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <div className="truncate font-bold text-ink">{item.name}</div>
                {type === "renewal" ? (
                  <Badge className="shrink-0 bg-[#fff1e8] text-action">재등록</Badge>
                ) : (
                  <Badge className="shrink-0 bg-gray-100 text-gray-700">상담</Badge>
                )}
              </div>
              <div className="mt-1 truncate text-sm text-muted">
                {type === "renewal"
                  ? `${item.passName ?? "회원권"} · 잔여 ${item.remainingSessions ?? "-"}회`
                  : `마지막 방문 ${daysSince(item.last_visit_date ?? null)}일 전`}
              </div>
              <div className="mt-0.5 text-xs text-muted">{maskPhone(item.phone ?? "")}</div>
            </div>
          </Link>
        ))}
        {items.length === 0 ? <div className="p-6 text-sm text-muted">{emptyText}</div> : null}
      </div>
    </Card>
  );
}
