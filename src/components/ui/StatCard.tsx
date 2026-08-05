import type { LucideIcon } from "lucide-react";
import { cn } from "@/utils/cn";

export interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  tone?: "brand" | "ink" | "muted";
  href?: string;
}

const toneStyles = {
  brand: "bg-brand-light text-brand-dark",
  ink: "bg-ink text-white",
  muted: "bg-bg-alt-2 text-ink",
};

export function StatCard({ label, value, icon: Icon, tone = "brand" }: StatCardProps) {
  return (
    <div className="rounded-lg border border-border bg-surface p-5 shadow-card transition-transform duration-300 hover:-translate-y-0.5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-muted">{label}</p>
        <div className={cn("flex size-9 items-center justify-center rounded-full", toneStyles[tone])}>
          <Icon className="size-4.5" />
        </div>
      </div>
      <p className="mt-3 text-3xl font-extrabold tracking-tight text-ink">{value}</p>
    </div>
  );
}
