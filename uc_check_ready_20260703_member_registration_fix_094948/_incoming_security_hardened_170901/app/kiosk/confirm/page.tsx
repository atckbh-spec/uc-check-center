import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, CheckCircle2, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { KioskMessageCard } from "@/components/kiosk/KioskNotice";
import { KioskShell } from "@/components/kiosk/KioskShell";
import { requireKioskAccess } from "@/lib/kiosk/access";
import { checkInMemberFromKiosk } from "@/lib/kiosk/actions";
import { getKioskMemberPreview } from "@/lib/kiosk/queries";
import { todayInKorea } from "@/lib/utils/format-date";

export const dynamic = "force-dynamic";

function getParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value ?? "";
}

export default async function KioskConfirmPage({ searchParams }: { searchParams: { memberId?: string | string[]; passId?: string | string[] } }) {
  await requireKioskAccess();
  const memberId = getParam(searchParams.memberId);
  const passId = getParam(searchParams.passId);
  if (!memberId || !passId) redirect("/kiosk");

  const preview = await getKioskMemberPreview(memberId, passId);

  async function confirm(formData: FormData) {
    "use server";
    const pin = String(formData.get("pin") || "");
    const result = await checkInMemberFromKiosk(memberId, passId, pin);
    const params = new URLSearchParams({
      ok: String(result.success),
      name: result.memberMaskedName ?? preview.maskedName,
      pass: result.passName ?? preview.pass?.pass_name ?? "",
      remaining: String(result.remainingSessionsAfterCheckIn ?? preview.pass?.remaining_sessions ?? 0),
      count: String(result.attendanceSessionNumber ?? ""),
      date: result.attendanceDate ?? todayInKorea(),
      message: result.message
    });
    redirect(`/kiosk/success?${params.toString()}`);
  }

  return (
    <KioskShell eyebrow="Step 3 · 출석 확인">
      <section className="w-full max-w-3xl">
        {!preview.canCheckIn ? (
          <div className="rounded-md border border-white/70 bg-white/95 p-5 shadow-subtle sm:p-8">
            <KioskMessageCard title="출석 체크가 어렵습니다" message={preview.message ?? "스태프에게 문의해 주세요."} />
            <Link
              className="focus-ring mt-5 inline-flex h-14 w-full items-center justify-center rounded-md bg-brand text-lg font-black text-white hover:bg-brand-dark"
              href="/kiosk"
            >
              처음으로
            </Link>
          </div>
        ) : (
          <Card className="overflow-hidden rounded-md border-white/70 bg-white/95 p-0 backdrop-blur">
            <div className="bg-brand-dark p-6 text-center text-white sm:p-8">
              <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-white/15">
                <CheckCircle2 className="size-9" />
              </div>
              <h1 className="mt-5 text-3xl font-black sm:text-5xl">{preview.maskedName}님이 맞으신가요?</h1>
              <p className="mt-3 text-base font-semibold text-white/75">출석 체크 전 회원권 정보를 확인해 주세요.</p>
            </div>

            <div className="grid gap-4 p-5 sm:p-8">
              <div className="rounded-md border border-line bg-surface p-5 sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-5">
                  <div className="flex items-center gap-4">
                    <div className="flex size-14 items-center justify-center rounded-md bg-brand-soft text-brand-dark">
                      <CreditCard className="size-7" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-muted">차감할 회원권</p>
                      <p className="text-2xl font-black text-ink">{preview.pass?.pass_name}</p>
                    </div>
                  </div>
                  <div className="rounded-md bg-white px-6 py-4 text-center shadow-sm">
                    <p className="text-sm font-bold text-muted">현재 잔여</p>
                    <p className="text-6xl font-black text-brand-dark">{preview.pass?.remaining_sessions}</p>
                    <p className="text-sm font-bold text-muted">회</p>
                  </div>
                </div>
              </div>

              <form action={confirm} className="grid gap-3">
                <label className="block text-left">
                  <span className="mb-2 block text-base font-black text-ink">개인 PIN 번호</span>
                  <Input
                    name="pin"
                    inputMode="numeric"
                    type="password"
                    placeholder="휴대폰 뒷자리 또는 등록 PIN"
                    className="h-16 text-center text-2xl font-black"
                    minLength={4}
                    maxLength={8}
                    required
                  />
                </label>
                <div className="grid gap-3 sm:grid-cols-[1fr_2fr]">
                  <Link
                    className="focus-ring inline-flex h-16 items-center justify-center gap-2 rounded-md border border-line bg-white text-lg font-black text-ink hover:bg-surface"
                    href="/kiosk"
                  >
                    <ArrowLeft className="size-5" />
                    뒤로
                  </Link>
                  <Button type="submit" className="h-16 text-xl font-black shadow-subtle">
                    PIN 확인 후 출석 체크
                  </Button>
                </div>
              </form>
            </div>
          </Card>
        )}
      </section>
    </KioskShell>
  );
}
