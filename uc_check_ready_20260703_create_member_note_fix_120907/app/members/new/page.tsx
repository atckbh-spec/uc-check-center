import { MemberForm } from "@/components/members/MemberForm";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/PageHeader";
import { StaffOnlyLayout } from "@/components/layout/StaffOnlyLayout";
import { createMember } from "@/lib/members/actions";
import { todayInKorea } from "@/lib/utils/format-date";

export const dynamic = "force-dynamic";

const errorMessage: Record<string, string> = {
  name_or_phone: "회원명과 휴대폰 번호를 확인해 주세요.",
  pin: "개인 PIN 번호는 숫자 4~8자리로 입력해 주세요.",
  schema: "운영 DB migration이 최신 상태가 아닙니다. Supabase SQL 적용 순서를 확인해 주세요.",
  member: "회원 기본 정보 저장에 실패했습니다. 잠시 후 다시 시도해 주세요.",
  pass: "회원권 생성에 실패했습니다. 잠시 후 다시 시도해 주세요."
};

export default function NewMemberPage({ searchParams }: { searchParams: { error?: string } }) {
  const message = searchParams.error ? errorMessage[searchParams.error] : null;

  return (
    <StaffOnlyLayout>
      <PageHeader title="회원 등록" description="회원 기본 정보와 첫 회원권을 한 번에 등록합니다." />
      <Card className="max-w-3xl p-6">
        {message ? <p className="mb-5 rounded-md bg-[#fff1e8] p-4 text-sm font-semibold text-action">{message}</p> : null}
        <MemberForm action={createMember} defaultStartDate={todayInKorea()} />
      </Card>
    </StaffOnlyLayout>
  );
}
