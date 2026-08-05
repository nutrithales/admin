"use client";

import { useRef, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Label, FieldGroup } from "@/components/ui/Input";
import { replacePlanoAlimentarPdfAction } from "@/services/planos.actions";
import { useToast } from "@/contexts/ToastContext";
import type { PlanoAlimentarComPaciente } from "@/services/planos.queries";

const fileInputClasses =
  "block w-full text-sm text-muted file:mr-4 file:rounded-full file:border-0 file:bg-brand file:px-4 file:py-2 file:text-sm file:font-semibold file:text-ink-deep hover:file:bg-brand-dark hover:file:text-white file:cursor-pointer cursor-pointer";

export function ReplacePdfModal({
  plano,
  onClose,
  onSaved,
}: {
  plano: PlanoAlimentarComPaciente | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!formRef.current || !plano) return;
    const formData = new FormData(formRef.current);

    setSaving(true);
    const result = await replacePlanoAlimentarPdfAction(plano.id, formData);
    setSaving(false);

    if (result.success) {
      toast({ kind: "success", title: result.message });
      onSaved();
      onClose();
    } else {
      toast({ kind: "error", title: "Não foi possível substituir", description: result.message });
    }
  }

  return (
    <Modal
      open={!!plano}
      onClose={onClose}
      title="Trocar PDF"
      description={plano ? `Novo arquivo para ${plano.paciente?.nome ?? "paciente"}` : undefined}
      size="sm"
    >
      <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-4">
        <FieldGroup>
          <Label htmlFor="arquivo-troca">Novo arquivo PDF</Label>
          <input
            id="arquivo-troca"
            name="arquivo"
            type="file"
            accept="application/pdf"
            required
            className={fileInputClasses}
          />
        </FieldGroup>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={saving}>
            Substituir
          </Button>
        </div>
      </form>
    </Modal>
  );
}
