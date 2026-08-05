import type { HTMLAttributes } from "react";
import { cn } from "@/utils/cn";

type Tone = "brand" | "ink" | "muted" | "success" | "warning" | "danger" | "info";

const toneStyles: Record<Tone, string> = {
  brand: "bg-brand-light text-brand-dark",
  ink: "bg-ink text-white",
  muted: "bg-bg-alt text-muted",
  success: "bg-brand-light text-success",
  warning: "bg-amber-50 text-warning",
  danger: "bg-red-50 text-danger",
  info: "bg-sky-50 text-info",
};

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
}

export function Badge({ className, tone = "muted", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold",
        toneStyles[tone],
        className,
      )}
      {...props}
    />
  );
}
