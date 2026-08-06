import { cn } from "@/utils/cn";

export interface MacroValues {
  kcal: number;
  proteina_g: number;
  carboidrato_g: number;
  gordura_g: number;
}

export interface MacroSummaryProps {
  label?: string;
  realizado: MacroValues;
  meta?: Partial<MacroValues>;
  compact?: boolean;
  className?: string;
}

type Tone = "brand" | "warning" | "danger";

const barColor: Record<Tone, string> = { brand: "bg-brand", warning: "bg-warning", danger: "bg-danger" };
const textColor: Record<Tone, string> = { brand: "text-brand-dark", warning: "text-warning", danger: "text-danger" };

function toneFor(realizado: number, meta?: number): Tone {
  if (!meta) return "brand";
  const ratio = realizado / meta;
  if (ratio >= 0.9 && ratio <= 1.1) return "brand";
  if (ratio >= 0.75 && ratio <= 1.25) return "warning";
  return "danger";
}

function MacroBar({ label, realizado, meta, unidade }: { label: string; realizado: number; meta?: number; unidade: string }) {
  const tone = toneFor(realizado, meta);
  const pct = meta ? Math.min(100, (realizado / meta) * 100) : 100;
  return (
    <div className="min-w-28 flex-1">
      <div className="flex items-baseline justify-between gap-2 text-xs">
        <span className="font-semibold text-ink">{label}</span>
        <span className={cn("font-medium tabular-nums", textColor[tone])}>
          {Math.round(realizado)}
          {unidade}
          {meta ? ` / ${Math.round(meta)}${unidade}` : ""}
        </span>
      </div>
      <div className="mt-1 h-1.5 rounded-full bg-bg-alt">
        <div className={cn("h-full rounded-full transition-all duration-300", barColor[tone])} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/** Realizado vs. meta para kcal/P/C/G — usado tanto por refeição quanto
 * pro dia inteiro no builder. Tons: verde (±10% da meta), amarelo (±25%),
 * vermelho (fora disso) — sem meta definida, sempre verde (nada a comparar). */
export function MacroSummary({ label, realizado, meta, compact, className }: MacroSummaryProps) {
  return (
    <div className={cn("flex flex-col gap-2", !compact && "rounded-lg border border-border bg-surface p-3", className)}>
      {label && <p className="text-sm font-semibold text-ink">{label}</p>}
      <div className="flex flex-wrap gap-4">
        <MacroBar label="Kcal" realizado={realizado.kcal} meta={meta?.kcal} unidade="" />
        <MacroBar label="Proteína" realizado={realizado.proteina_g} meta={meta?.proteina_g} unidade="g" />
        <MacroBar label="Carboidrato" realizado={realizado.carboidrato_g} meta={meta?.carboidrato_g} unidade="g" />
        <MacroBar label="Gordura" realizado={realizado.gordura_g} meta={meta?.gordura_g} unidade="g" />
      </div>
    </div>
  );
}
