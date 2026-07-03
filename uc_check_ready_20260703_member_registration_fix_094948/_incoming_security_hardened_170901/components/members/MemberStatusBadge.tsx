import { Badge } from "@/components/ui/badge";

export function MemberStatusBadge({ status }: { status: string }) {
  const tone = status === "active" ? "bg-green-50 text-green-700" : status === "paused" ? "bg-yellow-50 text-yellow-700" : "bg-gray-100 text-gray-700";
  return <Badge className={tone}>{status}</Badge>;
}
