"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Label, FieldGroup } from "@/components/ui/Input";
import { useToast } from "@/contexts/ToastContext";
import { changePacientePlanoAction } from "@/services/pacientes.actions";
import type { Tables } from "@/types/database.types";
import { includedConsultations, planEndDate, PLAN_OPTIONS } from "@/lib/agenda/plans";

export interface PlanoQuickEditModalProps {
  open?: boolean;
  paciente: Tables<"pacientes"> | null;
  pacientes?: Tables<"pacientes">[];
  onClose: () => void;
  onSaved: () => void;
}

function isoToday() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

function formatDate(date: Date | null) {
  return date?.toLocaleDateString("pt-BR", { timeZone: "UTC" }) ?? "Sem término automático";
}

export function PlanoQuickEditModal({ open = false, paciente, pacientes = [], onClose, onSaved }: PlanoQuickEditModalProps) {
  const { toast } = useToast();
  const [plano, setPlano] = useState("");
  const [consultasIncluidas, setConsultasIncluidas] = useState(1);
  const [consultasRealizadas, setConsultasRealizadas] = useState(0);
  const [dataInicio, setDataInicio] = useState(isoToday());
  const [pacienteId, setPacienteId] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (paciente) {
      setPacienteId(paciente.id);
      setPlano(paciente.plano ?? "Consulta Avulsa");
      setConsultasIncluidas(paciente.consultas_incluidas ?? includedConsultations(paciente.plano));
      setConsultasRealizadas(paciente.consultas_realizadas_iniciais ?? 0);
      setDataInicio(paciente.data_inicio ?? isoToday());
    } else if (open) {
      setPacienteId("");
      setPlano("Plano Essencial");
      setConsultasIncluidas(includedConsultations("Plano Essencial"));
      setConsultasRealizadas(0);
      setDataInicio(isoToday());
    }
  }, [open, paciente]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const targetId = paciente?.id ?? pacienteId;
    if (!targetId) {
      toast({ kind: "error", title: "Selecione um paciente" });
      return;
    }
    setSaving(true);
    const result = await changePacientePlanoAction(
      targetId,
      plano,
      consultasIncluidas,
      consultasRealizadas,
      dataInicio,
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
      open={open || !!paciente}
      onClose={onClose}
      title={paciente ? "Alterar plano" : "Adicionar plano ao paciente"}
      description={paciente ? `Plano atual de ${paciente.nome}` : "Defina o plano e a vigência do acompanhamento."}
      size="sm"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {!paciente && (
          <FieldGroup>
            <Label htmlFor="paciente-plano">Paciente</Label>
            <select id="paciente-plano" required value={pacienteId} onChange={(e) => setPacienteId(e.target.value)} className="w-full rounded-lg border border-border bg-surface px-4 py-3 text-sm text-ink outline-none focus:border-brand">
              <option value="">Selecione o paciente</option>
              {pacientes.map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}
            </select>
          </FieldGroup>
        )}
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
            <Label htmlFor="plano-inicio">Data de início</Label>
            <Input id="plano-inicio" type="date" required value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
          </FieldGroup>
          <FieldGroup>
            <Label>Data final calculada</Label>
            <div className="flex min-h-11 items-center rounded-lg border border-border bg-bg-alt px-4 text-sm font-semibold text-ink">
              {formatDate(planEndDate(dataInicio, plano))}
            </div>
          </FieldGroup>
        </div>
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
