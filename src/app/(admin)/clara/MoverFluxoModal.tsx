"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Label, FieldGroup, Textarea } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useToast } from "@/contexts/ToastContext";
import { updateFluxoPacienteAction } from "@/services/fluxo.actions";
import { resolverPendenciaAction } from "@/services/pendencias.actions";
import { FLOW_STAGES, getFlowStage, type FlowStageKey } from "@/lib/fluxo/stages";

export interface MoverFluxoModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  pacientes: { id: string; nome: string | null; fluxo_etapa: string }[];
  pacienteInicial?: string | null;
  pendenciaId?: string | null;
}

export function MoverFluxoModal({ open, onClose, onSaved, pacientes, pacienteInicial, pendenciaId }: MoverFluxoModalProps) {
  const { toast } = useToast();
  const [pacienteId, setPacienteId] = useState(pacienteInicial ?? "");
  const [etapa, setEtapa] = useState<FlowStageKey>(FLOW_STAGES[0].key);
  const [urgente, setUrgente] = useState(false);
  const [proximaAcaoEm, setProximaAcaoEm] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      const idInicial = pacienteInicial ?? "";
      setPacienteId(idInicial);
      const paciente = pacientes.find((p) => p.id === idInicial);
      setEtapa(paciente ? getFlowStage(paciente.fluxo_etapa).key : FLOW_STAGES[0].key);
      setUrgente(false);
      setProximaAcaoEm("");
      setObservacoes("");
    }
  }, [open, pacienteInicial, pacientes]);

  function trocarPaciente(id: string) {
    setPacienteId(id);
    const paciente = pacientes.find((p) => p.id === id);
    if (paciente) setEtapa(getFlowStage(paciente.fluxo_etapa).key);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!pacienteId) {
      toast({ kind: "error", title: "Selecione um paciente." });
      return;
    }

    setSaving(true);
    const pacienteAtual = pacientes.find((p) => p.id === pacienteId);
    const etapaAtual = pacienteAtual ? getFlowStage(pacienteAtual.fluxo_etapa).key : null;

    if (pendenciaId) {
      if (etapaAtual !== etapa) {
        const movimento = await updateFluxoPacienteAction(pacienteId, { etapa });
        if (!movimento.success) {
          setSaving(false);
          toast({ kind: "error", title: "Erro", description: movimento.message });
          return;
        }
      }

      const resolucao = await resolverPendenciaAction(pendenciaId);
      setSaving(false);
      if (!resolucao.success) {
        toast({ kind: "error", title: "Não foi possível resolver a pendência", description: resolucao.message });
        onSaved();
        onClose();
        return;
      }

      toast({ kind: "success", title: "Pendência resolvida", description: `Paciente atualizado para ${getFlowStage(etapa).label}.` });
      onSaved();
      onClose();
      return;
    }

    const result = await updateFluxoPacienteAction(pacienteId, {
      etapa,
      urgente,
      proximaAcaoEm: proximaAcaoEm ? new Date(proximaAcaoEm).toISOString() : undefined,
      observacoes,
    });
    setSaving(false);

    if (result.success) {
      toast({ kind: "success", title: result.message });
      onSaved();
      onClose();
    } else {
      toast({ kind: "error", title: "Erro", description: result.message });
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={pendenciaId ? "Resolver pendência e atualizar Kanban" : "Mover paciente no Fluxo"} size="sm">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <FieldGroup>
          <Label htmlFor="fluxo-paciente">Paciente</Label>
          <Select id="fluxo-paciente" value={pacienteId} onChange={(e) => trocarPaciente(e.target.value)} disabled={Boolean(pendenciaId)}>
            <option value="">Selecione um paciente</option>
            {pacientes.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome} — {getFlowStage(p.fluxo_etapa).label}
              </option>
            ))}
          </Select>
        </FieldGroup>
        <FieldGroup>
          <Label htmlFor="fluxo-etapa">{pendenciaId ? "Para qual Kanban o paciente vai?" : "Nova etapa"}</Label>
          <Select id="fluxo-etapa" value={etapa} onChange={(e) => setEtapa(e.target.value as FlowStageKey)}>
            {FLOW_STAGES.map((e) => (
              <option key={e.key} value={e.key}>
                {e.label}
              </option>
            ))}
          </Select>
        </FieldGroup>
        {!pendenciaId && <>
          <div className="grid grid-cols-2 gap-3">
            <FieldGroup>
              <Label htmlFor="fluxo-proxima-acao">Próxima ação em</Label>
              <Input id="fluxo-proxima-acao" type="date" value={proximaAcaoEm} onChange={(e) => setProximaAcaoEm(e.target.value)} />
            </FieldGroup>
            <label className="mt-6 flex items-center gap-2 text-sm font-semibold text-ink">
              <input type="checkbox" checked={urgente} onChange={(e) => setUrgente(e.target.checked)} className="size-4" />
              Marcar como urgente
            </label>
          </div>
          <FieldGroup>
            <Label htmlFor="fluxo-observacoes">Observações</Label>
            <Textarea id="fluxo-observacoes" value={observacoes} onChange={(e) => setObservacoes(e.target.value)} />
          </FieldGroup>
        </>}
        {pendenciaId && <p className="text-xs text-muted">Ao salvar, a pendência será marcada como resolvida e o paciente ficará na etapa escolhida. Se mantiver a etapa atual, os prazos e observações existentes serão preservados.</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={saving}>
            {pendenciaId ? "Resolver e atualizar Kanban" : "Salvar"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
