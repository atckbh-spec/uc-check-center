import Link from "next/link";
import { StaffOnlyLayout } from "@/components/layout/StaffOnlyLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { requireStaffUser } from "@/lib/auth/require-staff";
import { searchMembers } from "@/lib/members/queries";
import { checkInMemberAndRedirect } from "@/lib/attendance/actions";
import { maskPhone } from "@/lib/utils/mask-phone";

export const dynamic = "force-dynamic";

export default async function CheckInPage({ searchParams }: { searchParams: { q?: string } }) {
  const staff = await requireStaffUser();
  const members = searchParams.q ? await searchMembers(searchParams.q, staff.organization_id) : [];

  return (
    <StaffOnlyLayout>
      <PageHeader title="Quick check-in" description="회원명 또는 전화번호 마지막 4자리로 검색합니다." />
      <form className="mb-5 flex max-w-xl gap-2">
        <Input name="q" placeholder="Name or last 4 digits" defaultValue={searchParams.q ?? ""} />
        <Button type="submit">Search</Button>
      </form>
      <div className="grid gap-3">
        {(members as any[]).map((member) => {
          const activePasses = member.member_passes?.filter((pass: any) => pass.status === "active" && pass.remaining_sessions > 0) ?? [];
          return (
            <Card key={member.id} className="p-4">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <Link href={`/members/${member.id}`} className="font-semibold">{member.name}</Link>
                  <div className="text-sm text-muted">{maskPhone(member.phone)}</div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {activePasses.map((pass: any) => (
                    <form key={pass.id} action={checkInMemberAndRedirect}>
                      <input type="hidden" name="member_id" value={member.id} />
                      <input type="hidden" name="member_pass_id" value={pass.id} />
                      <Button type="submit" variant="secondary">{pass.pass_name} · {pass.remaining_sessions}</Button>
                    </form>
                  ))}
                  {activePasses.length === 0 ? <span className="text-sm text-muted">출석 가능한 회원권이 없습니다.</span> : null}
                </div>
              </div>
            </Card>
          );
        })}
        {searchParams.q && members.length === 0 ? <Card className="p-4 text-sm text-muted">검색 결과가 없습니다.</Card> : null}
      </div>
    </StaffOnlyLayout>
  );
}
