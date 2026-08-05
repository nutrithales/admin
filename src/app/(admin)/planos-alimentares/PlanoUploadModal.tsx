"use client";

import { useEffect, useRef, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Label, FieldGroup } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { createPlanoAlimentarAction } from "@/services/planos.actions";
import { useToast } from "@/contexts/ToastContext";

const fileInputClasses =
  "block w-full text-sm text-muted file:mr-4 file:rounded-full file:border-0 file:bg-brand file:px-4 file:py-2 file:text-sm file:font-semibold file:text-ink-deep hover:file:bg-brand-dark hover:file:text-white file:cursor-pointer cursor-pointer";

export interface PlanoUploadModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  pacientes: { id: string; nome: string }[];
  defaultPacienteId?: string;
}

export function PlanoUploadModal({
  open,
  onClose,
  onSaved,
  pacientes,
  defaultPacienteId,
}: PlanoUploadModalProps) {
  const { toast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  const [pacienteId, setPacienteId] = useState(defaultPacienteId ?? "");
  const [titulo, setTitulo] = useState("Plano alimentar");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setPacienteId(defaultPacienteId ?? "");
      setTitulo("Plano alimentar");
    }
  }, [open, defaultPacienteId]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!formRef.current) return;
    const formData = new FormData(formRef.current);

    setSaving(true);
    const result = await createPlanoAlimentarAction(formData);
    setSaving(false);

    if (result.success) {
      toast({ kind: "success", title: result.message });
      onSaved();
      onClose();
    } else {
      toast({ kind: "error", title: "Não foi possível enviar", description: result.message });
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Novo plano alimentar"
      description="Envie um PDF e selecione o paciente destinatário."
    >
      <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-4">
        <FieldGroup>
          <Label htmlFor="paciente_id">Paciente</Label>
          <Select
            id="paciente_id"
            name="paciente_id"
            required
            value={pacienteId}
            onChange={(e) => setPacienteId(e.target.value)}
          >
            <option value="">Selecione um paciente</option>
            {pacientes.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </Select>
        </FieldGroup>

        <FieldGroup>
          <Label htmlFor="titulo">Título</Label>
          <Input
            id="titulo"
            name="titulo"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="Plano alimentar — Julho/2026"
          />
        </FieldGroup>

        <FieldGroup>
          <Label htmlFor="arquivo">Arquivo PDF</Label>
          <input
            id="arquivo"
            name="arquivo"
            type="file"
            accept="application/pdf"
            required
            className={fileInputClasses}
          />
        </FieldGroup>

        <div className="mt-2 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={saving}>
            Enviar plano
          </Button>
        </div>
      </form>
    </Modal>
  );
}
