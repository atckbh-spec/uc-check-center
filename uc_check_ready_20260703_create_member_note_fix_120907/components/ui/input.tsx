import * as React from "react";
import { cn } from "@/lib/utils/cn";

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "focus-ring h-11 w-full rounded-md border border-line bg-white px-3 text-base text-ink placeholder:text-muted",
        props.className
      )}
    />
  );
}
