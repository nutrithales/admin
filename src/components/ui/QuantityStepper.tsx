"use client";

import { useState } from "react";
import { Minus, Plus } from "lucide-react";
import { cn } from "@/utils/cn";

export interface QuantityStepperProps {
  /** Sempre em gramas, independente do modo de exibição. */
  value: number;
  onChange: (value: number) => void;
  step?: number;
  /** Passo no modo unidade/porção — inteiro por padrão (1, 2, 3...), já
   * que é assim que porções (ex. fruta) são prescritas na prática. */
  stepUnidade?: number;
  min?: number;
  max?: number;
  /** Peso de 1 unidade/porção (ex. `alimentos.porcao_padrao_g`) — quando
   * informado, mostra um alternador g/unidade; o valor emitido continua
   * sempre em gramas. */
  unidadeGramas?: number;
  /** Modo inicial — alimentos do grupo "fruta" começam em "un" (o
   * nutricionista escolhe 1, 2, 3... porções, não gramas). Para reagir a
   * uma troca de alimento depois da montagem inicial, passe `key` no
   * componente (ex. `key={alimento?.id}`). */
  modoInicial?: "g" | "un";
  disabled?: boolean;
  className?: string;
}

export function QuantityStepper({
  value,
  onChange,
  step = 5,
  stepUnidade = 1,
  min = 0,
  max,
  unidadeGramas,
  modoInicial = "g",
  disabled,
  className,
}: QuantityStepperProps) {
  const [modo, setModo] = useState<"g" | "un">(modoInicial);
  const emUnidade = modo === "un" && !!unidadeGramas;
  const displayValue = emUnidade ? +(value / unidadeGramas!).toFixed(2) : value;
  const displayStep = emUnidade ? stepUnidade : step;

  function clamp(g: number) {
    let v = g;
    if (min !== undefined) v = Math.max(min, v);
    if (max !== undefined) v = Math.min(max, v);
    return v;
  }

  function setFromDisplay(displayVal: number) {
    const grams = emUnidade ? displayVal * unidadeGramas! : displayVal;
    onChange(clamp(Math.round(grams * 100) / 100));
  }

  return (
    <div className={cn("inline-flex items-center gap-1.5", className)}>
      <div className="flex items-center rounded-md border border-border bg-surface">
        <button
          type="button"
          disabled={disabled}
          onClick={() => setFromDisplay(displayValue - displayStep)}
          className="flex size-9 items-center justify-center text-muted transition-colors hover:bg-bg-alt hover:text-ink disabled:opacity-50"
          aria-label="Diminuir"
        >
          <Minus className="size-4" />
        </button>
        <input
          type="number"
          disabled={disabled}
          value={displayValue}
          step={displayStep}
          onChange={(e) => setFromDisplay(Number(e.target.value) || 0)}
          className="w-16 border-x border-border bg-transparent py-2 text-center text-[15px] text-ink focus:outline-none disabled:opacity-50"
        />
        <button
          type="button"
          disabled={disabled}
          onClick={() => setFromDisplay(displayValue + displayStep)}
          className="flex size-9 items-center justify-center text-muted transition-colors hover:bg-bg-alt hover:text-ink disabled:opacity-50"
          aria-label="Aumentar"
        >
          <Plus className="size-4" />
        </button>
      </div>

      {unidadeGramas ? (
        <div className="flex overflow-hidden rounded-md border border-border text-xs font-semibold">
          <button
            type="button"
            onClick={() => setModo("g")}
            className={cn("px-2.5 py-2 transition-colors", modo === "g" ? "bg-brand text-ink-deep" : "bg-surface text-muted hover:bg-bg-alt")}
          >
            g
          </button>
          <button
            type="button"
            onClick={() => setModo("un")}
            className={cn("px-2.5 py-2 transition-colors", modo === "un" ? "bg-brand text-ink-deep" : "bg-surface text-muted hover:bg-bg-alt")}
          >
            un
          </button>
        </div>
      ) : (
        <span className="text-sm text-muted-light">g</span>
      )}
    </div>
  );
}
