import Link from "next/link";
import { MemberStatusBadge } from "@/components/members/MemberStatusBadge";
import { maskPhone } from "@/lib/utils/mask-phone";
import { getMemberStatusTags } from "@/lib/utils/status-tags";
import { Badge } from "@/components/ui/badge";

export function MemberTable({ members }: { members: any[] }) {
  return (
    <div className="overflow-x-auto rounded-md border border-line bg-white">
      <table className="w-full min-w-[760px] text-left text-sm">
        <thead className="bg-surface text-muted">
          <tr>
            <th className="px-4 py-3">회원명</th>
            <th className="px-4 py-3">전화번호</th>
            <th className="px-4 py-3">활성 회원권</th>
            <th className="px-4 py-3">잔여</th>
            <th className="px-4 py-3">최근 방문</th>
            <th className="px-4 py-3">상태</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {members.map((member) => {
            const activePass = member.member_passes?.find((pass: any) => pass.status === "active");
            const tags = getMemberStatusTags(member, activePass);
            return (
              <tr key={member.id} className="hover:bg-surface">
                <td className="px-4 py-3 font-medium"><Link href={`/members/${member.id}`}>{member.name}</Link></td>
                <td className="px-4 py-3">{maskPhone(member.phone)}</td>
                <td className="px-4 py-3">{activePass?.pass_name ?? "-"}</td>
                <td className="px-4 py-3">{activePass?.remaining_sessions ?? "-"}</td>
                <td className="px-4 py-3">{member.last_visit_date ?? "-"}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    <MemberStatusBadge status={member.status} />
                    {tags.map((tag) => <Badge key={tag} className="bg-brand-soft text-brand-dark">{tag}</Badge>)}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {members.length === 0 ? <div className="p-4 text-sm text-muted">검색 결과가 없습니다.</div> : null}
    </div>
  );
}
