"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Label, FieldGroup } from "@/components/ui/Input";
import { useToast } from "@/contexts/ToastContext";
import { changePacientePlanoAction } from "@/services/pacientes.actions";
import type { Tables } from "@/types/database.types";
import { includedConsultations, PLAN_OPTIONS } from "@/lib/agenda/plans";

export interface PlanoQuickEditModalProps {
  paciente: Tables<"pacientes"> | null;
  onClose: () => void;
  onSaved: () => void;
}

export function PlanoQuickEditModal({ paciente, onClose, onSaved }: PlanoQuickEditModalProps) {
  const { toast } = useToast();
  const [plano, setPlano] = useState("");
  const [consultasIncluidas, setConsultasIncluidas] = useState(1);
  const [consultasRealizadas, setConsultasRealizadas] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (paciente) {
      setPlano(paciente.plano ?? "Consulta Avulsa");
      setConsultasIncluidas(paciente.consultas_incluidas ?? includedConsultations(paciente.plano));
      setConsultasRealizadas(paciente.consultas_realizadas_iniciais ?? 0);
    }
  }, [paciente]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!paciente) return;
    setSaving(true);
    const result = await changePacientePlanoAction(
      paciente.id,
      plano,
      consultasIncluidas,
      consultasRealizadas,
    );
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
    <Modal
      open={!!paciente}
      onClose={onClose}
      title="Alterar plano"
      description={paciente ? `Plano atual de ${paciente.nome}` : undefined}
      size="sm"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <FieldGroup>
          <Label htmlFor="plano-rapido">Plano</Label>
          <select
            id="plano-rapido"
            value={plano}
            onChange={(e) => {
              setPlano(e.target.value);
              setConsultasIncluidas(includedConsultations(e.target.value));
            }}
            className="w-full rounded-lg border border-border bg-surface px-4 py-3 text-sm text-ink outline-none focus:border-brand"
          >
            {PLAN_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </FieldGroup>
        <div className="grid grid-cols-2 gap-3">
          <FieldGroup>
            <Label htmlFor="consultas-incluidas">Consultas do plano</Label>
            <Input id="consultas-incluidas" type="number" min={1} value={consultasIncluidas} onChange={(e) => setConsultasIncluidas(Number(e.target.value))} />
          </FieldGroup>
          <FieldGroup>
            <Label htmlFor="consultas-realizadas">Já realizadas antes do sistema</Label>
            <Input id="consultas-realizadas" type="number" min={0} value={consultasRealizadas} onChange={(e) => setConsultasRealizadas(Number(e.target.value))} />
          </FieldGroup>
        </div>
        <p className="text-xs text-muted">As consultas marcadas como realizadas dentro do painel serão somadas automaticamente a esse histórico inicial.</p>
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
