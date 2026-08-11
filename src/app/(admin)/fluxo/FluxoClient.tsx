"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { History, ExternalLink, AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { useToast } from "@/contexts/ToastContext";
import { moverPacienteFluxoAction } from "@/services/fluxo.actions";
import { FLUXO_ETAPAS, FLUXO_ETAPA_LABEL, type FluxoEtapa } from "@/lib/clara/fluxo";
import type { PacienteNoFluxo } from "@/services/fluxo.queries";
import { HistoricoFluxoModal } from "./HistoricoFluxoModal";

export function FluxoClient({ porEtapa }: { porEtapa: Record<FluxoEtapa, PacienteNoFluxo[]> }) {
  const router = useRouter();
  const { toast } = useToast();
  const [historico, setHistorico] = useState<PacienteNoFluxo | null>(null);

  async function mover(paciente: PacienteNoFluxo, novaEtapa: FluxoEtapa) {
    const result = await moverPacienteFluxoAction(paciente.id, novaEtapa);
    toast({ kind: result.success ? "success" : "error", title: result.message });
    router.refresh();
  }

  const total = Object.values(porEtapa).reduce((acc, list) => acc + list.length, 0);

  return (
    <div>
      <PageHeader
        title="Fluxo de pacientes"
        description={`${total} paciente(s) no funil. Mova o paciente na etapa e o histórico é registrado automaticamente.`}
      />

      <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin">
        {FLUXO_ETAPAS.map((etapa) => {
          const pacientes = porEtapa[etapa] ?? [];
          return (
            <div key={etapa} className="flex w-72 shrink-0 flex-col rounded-lg border border-border bg-bg-alt-2">
              <div className="flex items-center justify-between border-b border-border px-3.5 py-2.5">
                <h2 className="text-sm font-bold text-ink">{FLUXO_ETAPA_LABEL[etapa]}</h2>
                <span className="text-xs font-semibold text-muted">{pacientes.length}</span>
              </div>
              <div className="flex flex-1 flex-col gap-2 p-2">
                {pacientes.length === 0 ? (
                  <p className="px-2 py-3 text-center text-xs text-muted-light">Vazio</p>
                ) : (
                  pacientes.map((paciente) => (
                    <div key={paciente.id} className="rounded-md border border-border bg-surface p-2.5 shadow-card">
                      <div className="flex items-start justify-between gap-1">
                        <p className="text-sm font-semibold text-ink">{paciente.nome}</p>
                        <div className="flex gap-1">
                          <button onClick={() => setHistorico(paciente)} className="text-muted hover:text-ink" aria-label="Histórico">
                            <History className="size-3.5" />
                          </button>
                          <Link href={`/pacientes/${paciente.id}`} className="text-muted hover:text-ink" aria-label="Abrir perfil">
                            <ExternalLink className="size-3.5" />
                          </Link>
                        </div>
                      </div>
                      {paciente.plano && <p className="text-xs text-muted">{paciente.plano}</p>}
                      <div className="mt-1 flex flex-wrap gap-1">
                        {paciente.fluxo_urgente && (
                          <Badge tone="danger">
                            <AlertTriangle className="size-3" /> Urgente
                          </Badge>
                        )}
                        {paciente.fluxo_proxima_acao_em && (
                          <Badge tone="muted">
                            até {new Date(paciente.fluxo_proxima_acao_em).toLocaleDateString("pt-BR")}
                          </Badge>
                        )}
                      </div>
                      {paciente.fluxo_observacoes && <p className="mt-1 text-xs text-muted">{paciente.fluxo_observacoes}</p>}
                      <Select
                        className="mt-2 py-1.5 text-xs"
                        value={etapa}
                        onChange={(e) => void mover(paciente, e.target.value as FluxoEtapa)}
                      >
                        {FLUXO_ETAPAS.map((e) => (
                          <option key={e} value={e}>
                            {FLUXO_ETAPA_LABEL[e]}
                          </option>
                        ))}
                      </Select>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      <HistoricoFluxoModal
        pacienteId={historico?.id ?? null}
        pacienteNome={historico?.nome ?? undefined}
        onClose={() => setHistorico(null)}
      />
    </div>
  );
}
