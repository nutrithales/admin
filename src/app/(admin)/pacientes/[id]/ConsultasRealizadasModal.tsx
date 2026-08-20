"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { FieldGroup, Input, Label } from "@/components/ui/Input";
import { useToast } from "@/contexts/ToastContext";
import { updateConsultasRealizadasIniciaisAction } from "@/services/pacientes.actions";

export function ConsultasRealizadasModal({
  open,
  onClose,
  pacienteId,
  realizadasNoSistema,
  realizadasIniciais,
}: {
  open: boolean;
  onClose: () => void;
  pacienteId: string;
  realizadasNoSistema: number;
  realizadasIniciais: number;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [quantidade, setQuantidade] = useState(realizadasIniciais);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setQuantidade(realizadasIniciais);
  }, [open, realizadasIniciais]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    const result = await updateConsultasRealizadasIniciaisAction(pacienteId, quantidade);
    setSaving(false);
    toast({ kind: result.success ? "success" : "error", title: result.message });
    if (result.success) {
      onClose();
      router.refresh();
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Editar consultas realizadas" description="Ajuste somente as consultas anteriores à implantação do sistema." size="sm">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="rounded-lg border border-border bg-bg-alt p-4">
          <p className="text-xs font-semibold text-muted">Registradas automaticamente no sistema</p>
          <p className="mt-1 text-xl font-bold text-ink">{realizadasNoSistema}</p>
        </div>
        <FieldGroup>
          <Label htmlFor="consultas-historico-inicial">Realizadas antes do sistema</Label>
          <Input id="consultas-historico-inicial" type="number" min={0} step={1} required value={quantidade} onChange={(event) => setQuantidade(Number(event.target.value))} />
        </FieldGroup>
        <p className="text-xs text-muted">Total exibido após salvar: {realizadasNoSistema + quantidade}. As consultas registradas no dashboard não serão alteradas.</p>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={saving}>Salvar ajuste</Button>
        </div>
      </form>
    </Modal>
  );
}
