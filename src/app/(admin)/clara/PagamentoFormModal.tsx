"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Label, FieldGroup, Textarea } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useToast } from "@/contexts/ToastContext";
import { registrarPagamentoAction } from "@/services/pagamentos.actions";

export interface PagamentoFormModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  pacientes: { id: string; nome: string | null }[];
  pacienteInicial?: string | null;
}

export function PagamentoFormModal({ open, onClose, onSaved, pacientes, pacienteInicial }: PagamentoFormModalProps) {
  const { toast } = useToast();
  const [pacienteId, setPacienteId] = useState(pacienteInicial ?? "");
  const [plano, setPlano] = useState("");
  const [valor, setValor] = useState("");
  const [formaPagamento, setFormaPagamento] = useState("");
  const [vencimento, setVencimento] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!pacienteId) {
      toast({ kind: "error", title: "Selecione um paciente." });
      return;
    }
    setSaving(true);
    const result = await registrarPagamentoAction({
      paciente_id: pacienteId,
      plano,
      valor: valor ? Number(valor) : undefined,
      forma_pagamento: formaPagamento,
      vencimento,
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
    <Modal open={open} onClose={onClose} title="Registrar pagamento" size="sm">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <FieldGroup>
          <Label htmlFor="pagamento-paciente">Paciente</Label>
          <Select id="pagamento-paciente" value={pacienteId} onChange={(e) => setPacienteId(e.target.value)}>
            <option value="">Selecione um paciente</option>
            {pacientes.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </Select>
        </FieldGroup>
        <div className="grid grid-cols-2 gap-3">
          <FieldGroup>
            <Label htmlFor="pagamento-plano">Plano</Label>
            <Input id="pagamento-plano" value={plano} onChange={(e) => setPlano(e.target.value)} />
          </FieldGroup>
          <FieldGroup>
            <Label htmlFor="pagamento-valor">Valor (R$)</Label>
            <Input id="pagamento-valor" type="number" min={0} step="0.01" value={valor} onChange={(e) => setValor(e.target.value)} />
          </FieldGroup>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FieldGroup>
            <Label htmlFor="pagamento-forma">Forma de pagamento</Label>
            <Input id="pagamento-forma" value={formaPagamento} onChange={(e) => setFormaPagamento(e.target.value)} placeholder="Pix, cartão..." />
          </FieldGroup>
          <FieldGroup>
            <Label htmlFor="pagamento-vencimento">Vencimento</Label>
            <Input id="pagamento-vencimento" type="date" value={vencimento} onChange={(e) => setVencimento(e.target.value)} />
          </FieldGroup>
        </div>
        <FieldGroup>
          <Label htmlFor="pagamento-observacoes">Observações</Label>
          <Textarea id="pagamento-observacoes" value={observacoes} onChange={(e) => setObservacoes(e.target.value)} />
        </FieldGroup>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={saving}>
            Registrar
          </Button>
        </div>
      </form>
    </Modal>
  );
}
