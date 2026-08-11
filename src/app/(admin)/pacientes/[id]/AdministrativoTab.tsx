"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Input";
import { useToast } from "@/contexts/ToastContext";
import type { Tables } from "@/types/database.types";
import { updateObservacoesAdministrativasAction } from "@/services/pacientes.actions";
import { resolverPendenciaAction } from "@/services/pendencias.actions";
import { marcarPagamentoAction } from "@/services/pagamentos.actions";
import { PENDENCIA_TIPO_LABEL, type PendenciaTipo } from "@/lib/clara/pendencias-engine";
import { fluxoEstagioLabel } from "@/lib/clara/fluxo";

const PRIORIDADE_TONE = { alta: "danger", media: "warning", baixa: "muted" } as const;
const PAGAMENTO_TONE = { pago: "success", pendente: "warning", atrasado: "danger", cancelado: "muted" } as const;

export function AdministrativoTab({
  pacienteId,
  fluxoEstagio,
  observacoes,
  pendencias,
  pagamentos,
  historicoFluxo,
}: {
  pacienteId: string;
  fluxoEstagio: string;
  observacoes: string | null;
  pendencias: Tables<"pendencias">[];
  pagamentos: Tables<"pagamentos">[];
  historicoFluxo: Tables<"fluxo_movimentacoes">[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [texto, setTexto] = useState(observacoes ?? "");
  const [saving, setSaving] = useState(false);

  async function salvarObservacoes() {
    setSaving(true);
    const result = await updateObservacoesAdministrativasAction(pacienteId, texto);
    setSaving(false);
    toast({ kind: result.success ? "success" : "error", title: result.message });
    router.refresh();
  }

  async function resolver(id: string) {
    const result = await resolverPendenciaAction(id);
    toast({ kind: result.success ? "success" : "error", title: result.message });
    router.refresh();
  }

  async function marcarPago(id: string) {
    const result = await marcarPagamentoAction(id, "pago");
    toast({ kind: result.success ? "success" : "error", title: result.message });
    router.refresh();
  }

  const pendenciasAtivas = pendencias.filter((p) => p.status !== "resolvida");

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <div className="p-6 pb-4">
          <h2 className="text-base font-bold text-ink">Fluxo</h2>
        </div>
        <div className="px-6 pb-6">
          <Badge tone="brand">{fluxoEstagioLabel(fluxoEstagio)}</Badge>
          {historicoFluxo.length > 0 && (
            <ul className="mt-4 flex flex-col gap-2 border-l-2 border-border pl-3">
              {historicoFluxo.slice(0, 5).map((mov) => (
                <li key={mov.id} className="text-sm text-muted">
                  {mov.de_estagio ? fluxoEstagioLabel(mov.de_estagio) : "Início"} → {fluxoEstagioLabel(mov.para_estagio)}
                  <span className="ml-2 text-xs text-muted-light">{new Date(mov.created_at).toLocaleDateString("pt-BR")}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>

      <Card>
        <div className="p-6 pb-4">
          <h2 className="text-base font-bold text-ink">Pendências</h2>
        </div>
        <div className="px-6 pb-6">
          {pendenciasAtivas.length === 0 ? (
            <p className="text-sm text-muted">Nenhuma pendência em aberto para este paciente.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {pendenciasAtivas.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 rounded-lg border border-border px-4 py-2.5">
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge tone={PRIORIDADE_TONE[p.prioridade as keyof typeof PRIORIDADE_TONE] ?? "muted"}>{p.prioridade}</Badge>
                      <span className="text-sm font-semibold text-ink">{PENDENCIA_TIPO_LABEL[p.tipo as PendenciaTipo] ?? p.tipo}</span>
                    </div>
                    <p className="text-sm text-muted">{p.motivo}</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => void resolver(p.id)}>
                    Resolver
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>

      <Card>
        <div className="p-6 pb-4">
          <h2 className="text-base font-bold text-ink">Pagamentos</h2>
        </div>
        <div className="px-6 pb-6">
          {pagamentos.length === 0 ? (
            <p className="text-sm text-muted">Nenhum pagamento registrado.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {pagamentos.map((pg) => (
                <li key={pg.id} className="flex items-center justify-between gap-3 rounded-lg border border-border px-4 py-2.5">
                  <div>
                    <p className="text-sm font-semibold text-ink">
                      {pg.plano ?? "Pagamento"} {pg.valor ? `— R$ ${pg.valor.toFixed(2)}` : ""}
                    </p>
                    <p className="text-xs text-muted">
                      {pg.vencimento ? `vencimento ${new Date(pg.vencimento).toLocaleDateString("pt-BR")}` : "sem vencimento"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone={PAGAMENTO_TONE[pg.status as keyof typeof PAGAMENTO_TONE] ?? "muted"}>{pg.status}</Badge>
                    {pg.status !== "pago" && (
                      <Button variant="ghost" size="sm" onClick={() => void marcarPago(pg.id)}>
                        Marcar pago
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>

      <Card>
        <div className="p-6 pb-4">
          <h2 className="text-base font-bold text-ink">Observações administrativas</h2>
          <p className="mt-1 text-sm text-muted">Recados de agenda/secretaria — nunca prontuário clínico.</p>
        </div>
        <div className="flex flex-col gap-3 px-6 pb-6">
          <Textarea value={texto} onChange={(e) => setTexto(e.target.value)} className="min-h-28" />
          <Button className="self-end" onClick={salvarObservacoes} loading={saving}>
            <Save className="size-4" /> Salvar
          </Button>
        </div>
      </Card>
    </div>
  );
}
