import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils/cn";

const toneClasses = {
  default: "border-line bg-white",
  calm: "border-brand/20 bg-brand-soft",
  attention: "border-action/30 bg-[#fff8f5]",
  dark: "border-brand-dark bg-brand-dark text-white"
};

const iconToneClasses = {
  default: "bg-surface text-brand-dark",
  calm: "bg-white text-brand-dark",
  attention: "bg-[#fff1e8] text-action",
  dark: "bg-white/15 text-white"
};

type CommandMetricCardProps = {
  label: string;
  value: number | string;
  detail?: string;
  icon: LucideIcon;
  tone?: keyof typeof toneClasses;
  href?: string;
};

export function CommandMetricCard({ label, value, detail, icon: Icon, tone = "default", href }: CommandMetricCardProps) {
  const content = (
    <Card className={cn("group relative overflow-hidden p-5 transition hover:-translate-y-0.5 hover:shadow-subtle", toneClasses[tone])}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className={cn("text-sm font-semibold", tone === "dark" ? "text-white/75" : "text-muted")}>{label}</div>
          <div className="mt-3 text-4xl font-black tracking-tight">{value}</div>
        </div>
        <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-md", iconToneClasses[tone])}>
          <Icon className="size-5" />
        </span>
      </div>
      {detail ? <div className={cn("mt-4 text-sm", tone === "dark" ? "text-white/70" : "text-muted")}>{detail}</div> : null}
      <div className="pointer-events-none absolute -right-8 -top-8 size-24 rounded-full bg-white/30 opacity-0 transition group-hover:opacity-100" />
    </Card>
  );

  if (!href) return content;
  return <Link href={href}>{content}</Link>;
}
