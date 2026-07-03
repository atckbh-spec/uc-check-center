"use client";

import { useState } from "react";
import { Delete } from "lucide-react";
import { Button } from "@/components/ui/button";

const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

export function KioskPinInput() {
  const [value, setValue] = useState("");

  function addDigit(digit: string) {
    setValue((current) => (current.length >= 4 ? current : current + digit));
  }

  return (
    <form action="/kiosk/search" className="mx-auto mt-8 w-full max-w-xl">
      <input type="hidden" name="last4" value={value} />
      <div className="grid grid-cols-4 gap-3" aria-label="전화번호 마지막 4자리 입력">
        {[0, 1, 2, 3].map((index) => (
          <div
            key={index}
            className="flex aspect-square min-h-20 items-center justify-center rounded-md border-2 border-brand/20 bg-white text-5xl font-black text-brand-dark shadow-subtle sm:min-h-28 sm:text-6xl"
          >
            {value[index] ?? ""}
          </div>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-3 gap-3">
        {keys.map((digit) => (
          <button
            key={digit}
            type="button"
            onClick={() => addDigit(digit)}
            className="focus-ring flex h-20 items-center justify-center rounded-md border border-line bg-white text-3xl font-black text-ink shadow-subtle active:scale-[0.98] sm:h-24 sm:text-4xl"
          >
            {digit}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setValue("")}
          className="focus-ring flex h-20 items-center justify-center rounded-md border border-line bg-white text-xl font-black text-muted shadow-subtle active:scale-[0.98] sm:h-24"
        >
          지우기
        </button>
        <button
          type="button"
          onClick={() => addDigit("0")}
          className="focus-ring flex h-20 items-center justify-center rounded-md border border-line bg-white text-3xl font-black text-ink shadow-subtle active:scale-[0.98] sm:h-24 sm:text-4xl"
        >
          0
        </button>
        <button
          type="button"
          onClick={() => setValue((current) => current.slice(0, -1))}
          className="focus-ring flex h-20 items-center justify-center rounded-md border border-line bg-white text-muted shadow-subtle active:scale-[0.98] sm:h-24"
          aria-label="마지막 숫자 삭제"
        >
          <Delete className="size-8" />
        </button>
      </div>

      <Button type="submit" disabled={value.length !== 4} className="mt-6 h-16 w-full text-xl font-black sm:h-20 sm:text-2xl">
        회원 찾기
      </Button>
    </form>
  );
}
