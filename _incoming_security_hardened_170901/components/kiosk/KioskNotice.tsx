import { Info } from "lucide-react";

export function KioskPrivacyNotice() {
  return (
    <div className="mt-6 rounded-md border border-brand/15 bg-brand-soft p-4 text-left text-sm font-semibold text-brand-dark">
      키오스크에는 마스킹된 이름, 마스킹된 전화번호, 회원권명, 잔여 횟수만 표시됩니다. 전체 전화번호, 메모, 관리자 정보는 표시하지 않습니다.
    </div>
  );
}

export function KioskMessageCard({ title, message }: { title: string; message: string }) {
  return (
    <div className="rounded-md border border-line bg-surface p-6 text-center">
      <div className="mx-auto flex size-12 items-center justify-center rounded-md bg-white text-brand-dark shadow-subtle">
        <Info className="size-6" />
      </div>
      <h3 className="mt-4 text-2xl font-black text-ink">{title}</h3>
      <p className="mt-2 text-base font-semibold text-muted">{message}</p>
    </div>
  );
}
