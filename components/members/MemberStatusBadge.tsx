import { Badge } from "@/components/ui/badge";

export function MemberStatusBadge({ status }: { status: string }) {
  const tone = status === "active" ? "bg-green-50 text-green-700" : status === "paused" ? "bg-yellow-50 text-yellow-700" : "bg-gray-100 text-gray-700";
  const label: Record<string, string> = {
    active: "활성",
    inactive: "비활성",
    paused: "일시정지",
    archived: "보관"
  };

  return <Badge className={tone}>{label[status] ?? status}</Badge>;
}
