import { MemberForm } from "@/components/members/MemberForm";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/PageHeader";
import { StaffOnlyLayout } from "@/components/layout/StaffOnlyLayout";
import { createMember } from "@/lib/members/actions";
import { todayInKorea } from "@/lib/utils/format-date";

export const dynamic = "force-dynamic";

export default function NewMemberPage() {
  return (
    <StaffOnlyLayout>
      <PageHeader title="회원 등록" description="회원 기본 정보와 첫 회원권을 한 번에 등록합니다." />
      <Card className="max-w-3xl p-6">
        <MemberForm action={createMember} defaultStartDate={todayInKorea()} />
      </Card>
    </StaffOnlyLayout>
  );
}
