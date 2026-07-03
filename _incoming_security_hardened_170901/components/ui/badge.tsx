import { cn } from "@/lib/utils/cn";

export function Badge({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn("inline-flex items-center rounded px-2 py-1 text-xs font-semibold", className)}
      {...props}
    />
  );
}
