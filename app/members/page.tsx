import Link from "next/link";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { StaffOnlyLayout } from "@/components/layout/StaffOnlyLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MemberTable } from "@/components/members/MemberTable";
import { requireStaffUser } from "@/lib/auth/require-staff";
import { searchMembers } from "@/lib/members/queries";

export const dynamic = "force-dynamic";

export default async function MembersPage({ searchParams }: { searchParams: { q?: string } }) {
  const staff = await requireStaffUser();
  const query = searchParams.q ?? "";
  const members = await searchMembers(query, staff.organization_id);

  return (
    <StaffOnlyLayout>
      <PageHeader
        title="회원 관리"
        description="회원 정보, 활성 회원권, 잔여 횟수, 오늘 출석 상태를 한 화면에서 확인합니다."
        actions={
          <Link className="inline-flex min-h-11 items-center gap-2 rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white" href="/members/new">
            <Plus className="size-4" />
            회원 등록
          </Link>
        }
      />
      <form className="mb-4 flex max-w-xl gap-2">
        <Input name="q" placeholder="이름 또는 전화번호 마지막 4자리" defaultValue={query} />
        <Button type="submit" variant="secondary">
          검색
        </Button>
      </form>
      <MemberTable members={members as any[]} />
    </StaffOnlyLayout>
  );
}
