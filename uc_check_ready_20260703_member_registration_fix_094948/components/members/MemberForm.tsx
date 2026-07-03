import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function MemberForm({ action, defaultStartDate }: { action: (formData: FormData) => void | Promise<void>; defaultStartDate: string }) {
  return (
    <form action={action} className="grid gap-5">
      <section className="grid gap-4">
        <div>
          <h2 className="text-lg font-bold text-ink">회원 기본 정보</h2>
          <p className="mt-1 text-sm text-muted">전화번호 뒷 4자리는 키오스크 검색과 개인 PIN 기본값으로 사용됩니다.</p>
        </div>

        <label>
          <span className="mb-1 block text-sm font-semibold">회원명</span>
          <Input name="name" placeholder="홍길동" className="h-12" required />
        </label>

        <label>
          <span className="mb-1 block text-sm font-semibold">핸드폰 번호</span>
          <Input name="phone" inputMode="tel" placeholder="010-1234-5678" className="h-12" required />
        </label>

        <div className="grid gap-4 md:grid-cols-2">
          <label>
            <span className="mb-1 block text-sm font-semibold">개인 PIN 번호</span>
            <Input name="pin" inputMode="numeric" placeholder="미입력 시 핸드폰 뒷자리" maxLength={8} className="h-12" />
          </label>
          <label>
            <span className="mb-1 block text-sm font-semibold">생년월일</span>
            <Input name="birth_date" type="date" className="h-12" />
          </label>
        </div>
      </section>

      <section className="grid gap-4 border-t border-line pt-5">
        <div>
          <h2 className="text-lg font-bold text-ink">회원권 정보</h2>
          <p className="mt-1 text-sm text-muted">등록과 동시에 활성 회원권이 생성됩니다.</p>
        </div>

        <label>
          <span className="mb-1 block text-sm font-semibold">회원권 모드</span>
          <select name="pass_mode" className="focus-ring h-12 w-full rounded-md border border-line bg-white px-3 text-base text-ink">
            <option value="10_sessions">10회 등록권</option>
            <option value="20_sessions">20회 등록권</option>
            <option value="monthly">한달 등록권</option>
          </select>
        </label>

        <div className="grid gap-4 md:grid-cols-2">
          <label>
            <span className="mb-1 block text-sm font-semibold">시작일</span>
            <Input name="start_date" type="date" defaultValue={defaultStartDate} className="h-12" />
          </label>
          <label>
            <span className="mb-1 block text-sm font-semibold">담당 서비스</span>
            <select name="service_type" className="focus-ring h-12 w-full rounded-md border border-line bg-white px-3 text-base text-ink">
              <option value="conditioning">컨디셔닝</option>
              <option value="pt">PT</option>
              <option value="group">그룹</option>
              <option value="trial">체험</option>
              <option value="other">기타</option>
            </select>
          </label>
        </div>

        <label>
          <span className="mb-1 block text-sm font-semibold">관리 메모</span>
          <textarea name="memo" className="focus-ring min-h-28 w-full rounded-md border border-line bg-white p-3" placeholder="관리자에게만 보이는 메모" />
        </label>
      </section>

      <Button type="submit" className="h-14 text-lg font-bold">회원 등록</Button>
    </form>
  );
}
