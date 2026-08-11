"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Label, FieldGroup, Textarea } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useToast } from "@/contexts/ToastContext";
import { createTarefaAction } from "@/services/tarefas.actions";

export interface TarefaFormModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  pacientes: { id: string; nome: string | null }[];
  pacienteInicial?: string | null;
}

export function TarefaFormModal({ open, onClose, onSaved, pacientes, pacienteInicial }: TarefaFormModalProps) {
  const { toast } = useToast();
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [pacienteId, setPacienteId] = useState(pacienteInicial ?? "");
  const [prioridade, setPrioridade] = useState<"baixa" | "media" | "alta">("media");
  const [prazo, setPrazo] = useState("");
  const [saving, setSaving] = useState(false);

  function reset() {
    setTitulo("");
    setDescricao("");
    setPacienteId(pacienteInicial ?? "");
    setPrioridade("media");
    setPrazo("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!titulo.trim()) {
      toast({ kind: "error", title: "Informe um título para a tarefa." });
      return;
    }
    setSaving(true);
    const result = await createTarefaAction({
      titulo,
      descricao,
      paciente_id: pacienteId || null,
      prioridade,
      prazo: prazo || null,
    });
    setSaving(false);

    if (result.success) {
      toast({ kind: "success", title: result.message });
      reset();
      onSaved();
      onClose();
    } else {
      toast({ kind: "error", title: "Erro", description: result.message });
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Nova tarefa" size="sm">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <FieldGroup>
          <Label htmlFor="tarefa-titulo">Título</Label>
          <Input id="tarefa-titulo" value={titulo} onChange={(e) => setTitulo(e.target.value)} />
        </FieldGroup>
        <FieldGroup>
          <Label htmlFor="tarefa-descricao">Descrição</Label>
          <Textarea id="tarefa-descricao" value={descricao} onChange={(e) => setDescricao(e.target.value)} />
        </FieldGroup>
        <FieldGroup>
          <Label htmlFor="tarefa-paciente">Paciente (opcional)</Label>
          <Select id="tarefa-paciente" value={pacienteId} onChange={(e) => setPacienteId(e.target.value)}>
            <option value="">Nenhum</option>
            {pacientes.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </Select>
        </FieldGroup>
        <div className="grid grid-cols-2 gap-3">
          <FieldGroup>
            <Label htmlFor="tarefa-prioridade">Prioridade</Label>
            <Select
              id="tarefa-prioridade"
              value={prioridade}
              onChange={(e) => setPrioridade(e.target.value as "baixa" | "media" | "alta")}
            >
              <option value="baixa">Baixa</option>
              <option value="media">Média</option>
              <option value="alta">Alta</option>
            </Select>
          </FieldGroup>
          <FieldGroup>
            <Label htmlFor="tarefa-prazo">Prazo</Label>
            <Input id="tarefa-prazo" type="date" value={prazo} onChange={(e) => setPrazo(e.target.value)} />
          </FieldGroup>
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={saving}>
            Criar tarefa
          </Button>
        </div>
      </form>
    </Modal>
  );
}
