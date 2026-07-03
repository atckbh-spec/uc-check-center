import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils/cn";

export function MetricCard({ label, value, detail, tone = "default" }: { label: string; value: number | string; detail?: string; tone?: "default" | "attention" | "calm" }) {
  return (
    <Card className={cn("p-5", tone === "attention" && "border-action/30 bg-[#fff8f5]", tone === "calm" && "border-brand/20 bg-brand-soft")}>
      <div className="text-sm font-medium text-muted">{label}</div>
      <div className="mt-2 text-3xl font-bold">{value}</div>
      {detail ? <div className="mt-2 text-sm text-muted">{detail}</div> : null}
    </Card>
  );
}
