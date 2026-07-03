import { KioskPinInput } from "@/components/kiosk/KioskPinInput";
import { KioskPrivacyNotice } from "@/components/kiosk/KioskNotice";
import { KioskShell } from "@/components/kiosk/KioskShell";
import { requireKioskAccess } from "@/lib/kiosk/access";

export const dynamic = "force-dynamic";

export default async function KioskPage() {
  await requireKioskAccess();

  return (
    <KioskShell eyebrow="Step 1 · 전화번호 확인">
      <section className="w-full max-w-3xl rounded-md border border-white/70 bg-white/95 p-6 text-center shadow-subtle backdrop-blur sm:p-10">
        <div className="mx-auto flex size-16 items-center justify-center rounded-md bg-brand-soft text-3xl font-black text-brand-dark sm:size-20">
          4
        </div>
        <h1 className="mt-6 text-3xl font-black tracking-tight text-ink sm:text-5xl">
          전화번호 끝 4자리를 입력해 주세요
        </h1>
        <p className="mt-4 text-base font-medium text-muted sm:text-lg">
          본인 확인 후 오늘 출석과 회원권 잔여 횟수가 자동으로 처리됩니다.
        </p>
        <KioskPinInput />
        <KioskPrivacyNotice />
      </section>
    </KioskShell>
  );
}
