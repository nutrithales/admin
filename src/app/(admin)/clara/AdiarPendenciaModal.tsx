"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Label, FieldGroup } from "@/components/ui/Input";
import { useToast } from "@/contexts/ToastContext";
import { adiarPendenciaAction } from "@/services/pendencias.actions";

function padrao3Dias() {
  const d = new Date();
  d.setDate(d.getDate() + 3);
  return d.toISOString().slice(0, 10);
}

export function AdiarPendenciaModal({
  pendenciaId,
  onClose,
  onSaved,
}: {
  pendenciaId: string | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [ate, setAte] = useState(padrao3Dias());
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!pendenciaId) return;
    setSaving(true);
    const result = await adiarPendenciaAction(pendenciaId, ate);
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
    <Modal open={!!pendenciaId} onClose={onClose} title="Adiar pendência" size="sm">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <FieldGroup>
          <Label htmlFor="adiar-ate">Adiar até</Label>
          <Input id="adiar-ate" type="date" value={ate} onChange={(e) => setAte(e.target.value)} />
        </FieldGroup>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={saving}>
            Adiar
          </Button>
        </div>
      </form>
    </Modal>
  );
}
