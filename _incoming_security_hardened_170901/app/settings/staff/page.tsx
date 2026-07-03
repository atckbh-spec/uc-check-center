import Link from "next/link";
import { BarChart3, Plus, ShieldCheck, UserCheck, UserCog, Users } from "lucide-react";
import { createStaffUser, updateStaffUser } from "@/lib/staff/actions";
import { getAssignableStaff, getStaffUsers } from "@/lib/staff/queries";
import { requireStaffUser } from "@/lib/auth/require-staff";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/layout/PageHeader";
import { StaffOnlyLayout } from "@/components/layout/StaffOnlyLayout";

export const dynamic = "force-dynamic";

const roleLabel: Record<string, string> = {
  owner: "운영자",
  admin: "관리자",
  coach: "코치",
  front_desk: "프런트"
};

function SummaryCard({ label, value, icon: Icon }: { label: string; value: number; icon: any }) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold text-muted">{label}</div>
        <Icon className="size-5 text-brand-dark" />
      </div>
      <div className="mt-3 text-3xl font-bold text-ink">{value}</div>
    </Card>
  );
}

export default async function StaffSettingsPage() {
  const currentStaff = await requireStaffUser();
  const staffUsers = await getStaffUsers(currentStaff.organization_id);
  const activeStaff = staffUsers.filter((staff) => staff.is_active);
  const assignableStaff = getAssignableStaff(staffUsers);
  const managers = staffUsers.filter((staff) => staff.is_active && ["owner", "admin"].includes(staff.role));
  const assignedTotal = staffUsers.reduce((sum, staff) => sum + staff.assignedMemberCount, 0);
  const canEdit = currentStaff.role === "owner" || currentStaff.role === "admin";
  const maxAssigned = Math.max(1, ...staffUsers.map((staff) => staff.assignedMemberCount));

  return (
    <StaffOnlyLayout>
      <PageHeader
        title="직원 설정"
        description="직원 추가, 권한, 활성 상태, 담당 회원 분배를 관리합니다."
        actions={
          <Link href="/reports/monthly?view=staff" className="inline-flex min-h-11 items-center gap-2 rounded-md border border-line bg-white px-4 text-sm font-bold text-ink">
            <BarChart3 className="size-4" />
            담당 리포트 보기
          </Link>
        }
      />

      <section className="grid gap-4 md:grid-cols-5">
        <SummaryCard label="전체 직원" value={staffUsers.length} icon={Users} />
        <SummaryCard label="활성 직원" value={activeStaff.length} icon={UserCheck} />
        <SummaryCard label="담당 가능" value={assignableStaff.length} icon={UserCog} />
        <SummaryCard label="관리 권한" value={managers.length} icon={ShieldCheck} />
        <SummaryCard label="담당 회원" value={assignedTotal} icon={BarChart3} />
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1fr_380px]">
        <Card className="overflow-hidden">
          <div className="border-b border-line p-5">
            <h2 className="font-semibold">직원 목록</h2>
            <p className="mt-1 text-sm text-muted">담당자는 활성 상태의 운영자, 관리자, 코치만 지정할 수 있습니다.</p>
          </div>

          <div className="divide-y divide-line">
            {staffUsers.map((staff) => {
              const assignable = staff.is_active && ["owner", "admin", "coach"].includes(staff.role);
              return (
                <div key={staff.id} className="grid gap-4 p-5 lg:grid-cols-[1fr_420px] lg:items-center">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="text-lg font-bold text-ink">{staff.name}</div>
                      <Badge className={staff.is_active ? "bg-brand-soft text-brand-dark" : "bg-gray-100 text-gray-600"}>
                        {staff.is_active ? "활성" : "비활성"}
                      </Badge>
                      <Badge className="bg-gray-100 text-gray-700">{roleLabel[staff.role] ?? staff.role}</Badge>
                      <Badge className={assignable ? "bg-brand-soft text-brand-dark" : "bg-gray-100 text-gray-600"}>
                        {assignable ? "담당 가능" : "담당 불가"}
                      </Badge>
                    </div>
                    <div className="mt-1 text-sm text-muted">{staff.email}</div>
                    <div className="mt-3 max-w-md">
                      <div className="flex justify-between text-xs text-muted">
                        <span>담당 회원</span>
                        <span>{staff.assignedMemberCount}명</span>
                      </div>
                      <div className="mt-1 h-2 overflow-hidden rounded bg-brand-soft">
                        <div className="h-full rounded bg-brand" style={{ width: `${Math.max(4, Math.round((staff.assignedMemberCount / maxAssigned) * 100))}%` }} />
                      </div>
                    </div>
                  </div>

                  {canEdit ? (
                    <form action={updateStaffUser} className="grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-center">
                      <input type="hidden" name="staff_id" value={staff.id} />
                      <select name="role" defaultValue={staff.role} className="focus-ring h-11 rounded-md border border-line bg-white px-3">
                        <option value="owner">운영자</option>
                        <option value="admin">관리자</option>
                        <option value="coach">코치</option>
                        <option value="front_desk">프런트</option>
                      </select>
                      <label className="flex h-11 items-center gap-2 rounded-md border border-line bg-white px-3 text-sm font-semibold">
                        <input name="is_active" type="checkbox" defaultChecked={staff.is_active} />
                        활성
                      </label>
                      <Button type="submit" variant="secondary" className="h-11">저장</Button>
                    </form>
                  ) : (
                    <div className="rounded-md bg-surface p-3 text-sm text-muted">직원 설정 변경 권한이 없습니다.</div>
                  )}
                </div>
              );
            })}
            {staffUsers.length === 0 ? <div className="p-5 text-sm text-muted">등록된 직원이 없습니다.</div> : null}
          </div>
        </Card>

        <div className="space-y-6">
          <Card className="p-5">
            <div className="flex items-center gap-2">
              <Plus className="size-5 text-brand-dark" />
              <h2 className="font-semibold">직원 추가</h2>
            </div>
            {canEdit ? (
              <form action={createStaffUser} className="mt-5 grid gap-3">
                <label>
                  <span className="mb-1 block text-sm font-semibold">직원명</span>
                  <Input name="name" placeholder="홍길동" required />
                </label>
                <label>
                  <span className="mb-1 block text-sm font-semibold">이메일</span>
                  <Input name="email" type="email" placeholder="staff@example.com" required />
                </label>
                <label>
                  <span className="mb-1 block text-sm font-semibold">역할</span>
                  <select name="role" defaultValue="coach" className="focus-ring h-11 w-full rounded-md border border-line bg-white px-3">
                    <option value="owner">운영자</option>
                    <option value="admin">관리자</option>
                    <option value="coach">코치</option>
                    <option value="front_desk">프런트</option>
                  </select>
                </label>
                <label className="flex h-11 items-center gap-2 rounded-md border border-line bg-white px-3 text-sm font-semibold">
                  <input name="is_active" type="checkbox" defaultChecked />
                  활성 직원으로 추가
                </label>
                <Button type="submit" className="h-12 w-full">
                  <Plus className="size-4" />
                  직원 초대 및 추가
                </Button>
                <p className="text-xs text-muted">실제 Supabase 연결 환경에서는 입력한 이메일로 로그인 초대가 발송됩니다.</p>
              </form>
            ) : (
              <p className="mt-4 rounded-md bg-surface p-3 text-sm text-muted">직원 추가 권한이 없습니다.</p>
            )}
          </Card>

          <Card className="p-5">
            <h2 className="font-semibold">운영 가이드</h2>
            <div className="mt-4 grid gap-3 text-sm text-muted">
              <div className="rounded-md bg-surface p-3">
                <div className="font-semibold text-ink">운영자/관리자</div>
                <div className="mt-1">직원 추가, 권한 변경, 출석 취소, 담당자 지정이 가능합니다.</div>
              </div>
              <div className="rounded-md bg-surface p-3">
                <div className="font-semibold text-ink">코치</div>
                <div className="mt-1">회원 담당자로 지정할 수 있고 회원 상세에서 리텐션 관리를 담당합니다.</div>
              </div>
              <div className="rounded-md bg-surface p-3">
                <div className="font-semibold text-ink">프런트</div>
                <div className="mt-1">현장 출석과 기본 운영을 담당하지만 회원 담당자로는 지정하지 않습니다.</div>
              </div>
            </div>
          </Card>
        </div>
      </section>
    </StaffOnlyLayout>
  );
}
