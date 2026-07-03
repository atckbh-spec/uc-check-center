"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export function KioskAutoReturn({ seconds = 5 }: { seconds?: number }) {
  const router = useRouter();
  const [remaining, setRemaining] = useState(seconds);

  useEffect(() => {
    const tick = window.setInterval(() => setRemaining((current) => Math.max(0, current - 1)), 1000);
    const timeout = window.setTimeout(() => router.replace("/kiosk"), seconds * 1000);
    return () => {
      window.clearInterval(tick);
      window.clearTimeout(timeout);
    };
  }, [router, seconds]);

  return <p className="mt-5 text-sm font-semibold text-muted">{remaining}초 후 처음 화면으로 돌아갑니다.</p>;
}
