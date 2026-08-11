"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Label, FieldGroup, Textarea } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useToast } from "@/contexts/ToastContext";
import { updateFluxoPacienteAction } from "@/services/fluxo.actions";
import { FLOW_STAGES, getFlowStage, type FlowStageKey } from "@/lib/fluxo/stages";

export interface MoverFluxoModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  pacientes: { id: string; nome: string | null; fluxo_etapa: string }[];
  pacienteInicial?: string | null;
}

export function MoverFluxoModal({ open, onClose, onSaved, pacientes, pacienteInicial }: MoverFluxoModalProps) {
  const { toast } = useToast();
  const [pacienteId, setPacienteId] = useState(pacienteInicial ?? "");
  const [etapa, setEtapa] = useState<FlowStageKey>(FLOW_STAGES[0].key);
  const [urgente, setUrgente] = useState(false);
  const [proximaAcaoEm, setProximaAcaoEm] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setPacienteId(pacienteInicial ?? "");
      setUrgente(false);
      setProximaAcaoEm("");
      setObservacoes("");
    }
  }, [open, pacienteInicial]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!pacienteId) {
      toast({ kind: "error", title: "Selecione um paciente." });
      return;
    }
    setSaving(true);
    const result = await updateFluxoPacienteAction(pacienteId, {
      etapa,
      urgente,
      proximaAcaoEm: proximaAcaoEm ? new Date(proximaAcaoEm).toISOString() : null,
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
    <Modal open={open} onClose={onClose} title="Mover paciente no Fluxo" size="sm">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <FieldGroup>
          <Label htmlFor="fluxo-paciente">Paciente</Label>
          <Select id="fluxo-paciente" value={pacienteId} onChange={(e) => setPacienteId(e.target.value)}>
            <option value="">Selecione um paciente</option>
            {pacientes.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome} — {getFlowStage(p.fluxo_etapa).label}
              </option>
            ))}
          </Select>
        </FieldGroup>
        <FieldGroup>
          <Label htmlFor="fluxo-etapa">Nova etapa</Label>
          <Select id="fluxo-etapa" value={etapa} onChange={(e) => setEtapa(e.target.value as FlowStageKey)}>
            {FLOW_STAGES.map((e) => (
              <option key={e.key} value={e.key}>
                {e.label}
              </option>
            ))}
          </Select>
        </FieldGroup>
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
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={saving}>
            Salvar
          </Button>
        </div>
      </form>
    </Modal>
  );
}
