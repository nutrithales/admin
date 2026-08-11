"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Label, FieldGroup, Textarea } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useToast } from "@/contexts/ToastContext";
import { moverPacienteFluxoAction } from "@/services/fluxo.actions";
import { FLUXO_ESTAGIOS, FLUXO_ESTAGIO_LABEL, type FluxoEstagio } from "@/lib/clara/fluxo";

export interface MoverFluxoModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  pacientes: { id: string; nome: string | null; fluxo_estagio: string }[];
  pacienteInicial?: string | null;
}

export function MoverFluxoModal({ open, onClose, onSaved, pacientes, pacienteInicial }: MoverFluxoModalProps) {
  const { toast } = useToast();
  const [pacienteId, setPacienteId] = useState(pacienteInicial ?? "");
  const [estagio, setEstagio] = useState<FluxoEstagio>("novo_lead");
  const [observacao, setObservacao] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setPacienteId(pacienteInicial ?? "");
      setObservacao("");
    }
  }, [open, pacienteInicial]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!pacienteId) {
      toast({ kind: "error", title: "Selecione um paciente." });
      return;
    }
    setSaving(true);
    const result = await moverPacienteFluxoAction(pacienteId, estagio, observacao);
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
                {p.nome} — {FLUXO_ESTAGIO_LABEL[p.fluxo_estagio as FluxoEstagio] ?? p.fluxo_estagio}
              </option>
            ))}
          </Select>
        </FieldGroup>
        <FieldGroup>
          <Label htmlFor="fluxo-estagio">Nova etapa</Label>
          <Select id="fluxo-estagio" value={estagio} onChange={(e) => setEstagio(e.target.value as FluxoEstagio)}>
            {FLUXO_ESTAGIOS.map((e) => (
              <option key={e} value={e}>
                {FLUXO_ESTAGIO_LABEL[e]}
              </option>
            ))}
          </Select>
        </FieldGroup>
        <FieldGroup>
          <Label htmlFor="fluxo-observacao">Observação (opcional)</Label>
          <Textarea id="fluxo-observacao" value={observacao} onChange={(e) => setObservacao(e.target.value)} />
        </FieldGroup>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={saving}>
            Mover
          </Button>
        </div>
      </form>
    </Modal>
  );
}
