"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Label, FieldGroup } from "@/components/ui/Input";
import { useToast } from "@/contexts/ToastContext";
import { changePacientePlanoAction } from "@/services/pacientes.actions";
import type { Tables } from "@/types/database.types";

export interface PlanoQuickEditModalProps {
  paciente: Tables<"pacientes"> | null;
  onClose: () => void;
  onSaved: () => void;
}

export function PlanoQuickEditModal({ paciente, onClose, onSaved }: PlanoQuickEditModalProps) {
  const { toast } = useToast();
  const [plano, setPlano] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (paciente) setPlano(paciente.plano ?? "");
  }, [paciente]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!paciente) return;
    setSaving(true);
    const result = await changePacientePlanoAction(paciente.id, plano);
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
          <Input
            id="plano-rapido"
            value={plano}
            onChange={(e) => setPlano(e.target.value)}
            placeholder="Acompanhamento mensal"
          />
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
