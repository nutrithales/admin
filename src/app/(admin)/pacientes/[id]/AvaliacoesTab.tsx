"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Activity, Scale, Percent, Ruler, Dumbbell } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import type { Tables } from "@/types/database.types";
import { getExtraText } from "@/utils/validation/avaliacao-fisica";
import { AvaliacaoDetailModal } from "./AvaliacaoDetailModal";

type MetricConfig = {
  label: string;
  suffix: string;
  icon: typeof Scale;
  getValue: (assessment: Tables<"avaliacoes_fisicas">) => number | null;
  lowerIsBetter?: boolean;
  higherIsBetter?: boolean;
};

const overviewMetrics: MetricConfig[] = [
  { label: "Peso", suffix: "kg", icon: Scale, getValue: (assessment) => assessment.peso_kg },
  { label: "Gordura", suffix: "%", icon: Percent, getValue: (assessment) => assessment.percentual_gordura, lowerIsBetter: true },
  { label: "Cintura", suffix: "cm", icon: Ruler, getValue: (assessment) => assessment.circunferencia_cintura_cm, lowerIsBetter: true },
  { label: "Massa magra", suffix: "kg", icon: Dumbbell, getValue: (assessment) => assessment.massa_magra_kg, higherIsBetter: true },
];

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

function countRecordedMeasures(assessment: Tables<"avaliacoes_fisicas">) {
  const standard = [
    assessment.peso_kg,
    assessment.altura_cm,
    assessment.circunferencia_cintura_cm,
    assessment.circunferencia_quadril_cm,
    assessment.circunferencia_braco_cm,
    assessment.circunferencia_coxa_cm,
    assessment.percentual_gordura,
    assessment.massa_magra_kg,
    assessment.massa_gorda_kg,
  ].filter((value) => value !== null).length;
  const extra = assessment.medidas_extra && typeof assessment.medidas_extra === "object" && !Array.isArray(assessment.medidas_extra)
    ? Object.values(assessment.medidas_extra).filter((value) => typeof value === "number").length
    : 0;
  return standard + extra;
}

export function AvaliacoesTab({ avaliacoes, authId }: { avaliacoes: Tables<"avaliacoes_fisicas">[]; authId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Tables<"avaliacoes_fisicas"> | null>(null);

  function refresh() {
    router.refresh();
  }

  const latest = avaliacoes[0];
  const previous = avaliacoes[1];

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-bold text-ink">Histórico de composição corporal</h2>
          <p className="text-sm text-muted">Acompanhe a evolução e abra qualquer registro para ver todas as medidas.</p>
        </div>
        <Button
          className="shrink-0"
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
        >
          <Plus className="size-4" /> Nova avaliação
        </Button>
      </div>

      {avaliacoes.length === 0 ? (
        <EmptyState
          icon={Activity}
          title="Nenhuma avaliação física registrada"
          description="Registre a primeira avaliação com antropometria e, se tiver, o PDF do Bodymetrix."
          action={
            <Button onClick={() => setOpen(true)}>
              <Plus className="size-4" /> Nova avaliação
            </Button>
          }
        />
      ) : (
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {overviewMetrics.map((metric) => {
              const currentValue = latest ? metric.getValue(latest) : null;
              const previousValue = previous ? metric.getValue(previous) : null;
              const delta = currentValue !== null && previousValue !== null ? currentValue - previousValue : null;
              const favorable = delta !== null && ((metric.lowerIsBetter && delta < 0) || (metric.higherIsBetter && delta > 0));
              const unfavorable = delta !== null && ((metric.lowerIsBetter && delta > 0) || (metric.higherIsBetter && delta < 0));
              const Icon = metric.icon;

              return (
                <div key={metric.label} className="rounded-xl border border-border bg-surface p-4 shadow-card">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-xs font-semibold text-muted">{metric.label}</p>
                    <Icon className="size-4 text-brand-dark" />
                  </div>
                  <p className="text-xl font-bold text-ink">
                    {currentValue === null ? "—" : currentValue.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} {currentValue === null ? "" : metric.suffix}
                  </p>
                  <p className={`mt-1 text-xs font-semibold ${favorable ? "text-success" : unfavorable ? "text-danger" : "text-muted-light"}`}>
                    {delta === null ? "Sem avaliação anterior" : `${delta > 0 ? "+" : ""}${delta.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} ${metric.suffix} desde a anterior`}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="flex flex-col gap-3">
            {avaliacoes.map((assessment, index) => {
              const method = getExtraText(assessment.medidas_extra, "metodo");
              const protocol = getExtraText(assessment.medidas_extra, "protocolo");
              const measures = countRecordedMeasures(assessment);

              return (
                <button
                  key={assessment.id}
                  type="button"
                  onClick={() => {
                    setEditing(assessment);
                    setOpen(true);
                  }}
                  className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4 text-left shadow-card transition-colors hover:bg-bg-alt-2 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-ink">{formatDate(assessment.data)}</p>
                      {index === 0 && <Badge tone="success">Mais recente</Badge>}
                    </div>
                    <p className="mt-1 text-xs text-muted-light">
                      {method || "Método não informado"}{protocol ? ` · ${protocol}` : ""} · {measures} {measures === 1 ? "medida registrada" : "medidas registradas"}
                      {assessment.path ? " · PDF anexado" : ""}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      {assessment.peso_kg !== null ? `${assessment.peso_kg} kg` : "Peso não informado"} · {assessment.percentual_gordura !== null ? `${assessment.percentual_gordura}% de gordura` : "% de gordura não informado"}
                    </p>
                  </div>
                  <Badge tone={assessment.disponivel_paciente ? "success" : "muted"}>
                    {assessment.disponivel_paciente ? "Resumo liberado" : "Privada"}
                  </Badge>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <AvaliacaoDetailModal open={open} onClose={() => setOpen(false)} onSaved={refresh} authId={authId} avaliacao={editing} />
    </div>
  );
}
