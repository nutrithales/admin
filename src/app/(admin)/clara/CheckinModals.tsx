"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Label, FieldGroup, Textarea } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useToast } from "@/contexts/ToastContext";
import { enviarCheckinAction, registrarRespostaCheckinAction } from "@/services/checkins.actions";

export interface PacienteOpcao {
  authId: string;
  id: string;
  nome: string | null;
}

export function EnviarCheckinModal({
  open,
  onClose,
  onSaved,
  pacientes,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  pacientes: PacienteOpcao[];
}) {
  const { toast } = useToast();
  const [authId, setAuthId] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!authId) {
      toast({ kind: "error", title: "Selecione um paciente." });
      return;
    }
    setSaving(true);
    const result = await enviarCheckinAction(authId);
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
    <Modal open={open} onClose={onClose} title="Enviar check-in" size="sm">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <FieldGroup>
          <Label htmlFor="checkin-envio-paciente">Paciente</Label>
          <Select id="checkin-envio-paciente" value={authId} onChange={(e) => setAuthId(e.target.value)}>
            <option value="">Selecione um paciente</option>
            {pacientes.map((p) => (
              <option key={p.authId} value={p.authId}>
                {p.nome}
              </option>
            ))}
          </Select>
        </FieldGroup>
        <p className="text-xs text-muted">
          Isso apenas registra que o check-in foi enviado. Use &quot;Preparar mensagem&quot; para gerar o texto de envio.
        </p>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={saving}>
            Marcar como enviado
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export function RegistrarRespostaCheckinModal({
  open,
  onClose,
  onSaved,
  pacientes,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  pacientes: PacienteOpcao[];
}) {
  const { toast } = useToast();
  const [authId, setAuthId] = useState("");
  const [resumo, setResumo] = useState("");
  const [pontuacao, setPontuacao] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!authId || !resumo.trim()) {
      toast({ kind: "error", title: "Selecione o paciente e informe o resumo." });
      return;
    }
    setSaving(true);
    const result = await registrarRespostaCheckinAction(authId, resumo, pontuacao ? Number(pontuacao) : undefined);
    setSaving(false);
    if (result.success) {
      toast({ kind: "success", title: result.message });
      setResumo("");
      setPontuacao("");
      onSaved();
      onClose();
    } else {
      toast({ kind: "error", title: "Erro", description: result.message });
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Registrar resposta do check-in" size="sm">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <FieldGroup>
          <Label htmlFor="checkin-resposta-paciente">Paciente</Label>
          <Select id="checkin-resposta-paciente" value={authId} onChange={(e) => setAuthId(e.target.value)}>
            <option value="">Selecione um paciente</option>
            {pacientes.map((p) => (
              <option key={p.authId} value={p.authId}>
                {p.nome}
              </option>
            ))}
          </Select>
        </FieldGroup>
        <FieldGroup>
          <Label htmlFor="checkin-resumo">Resumo da resposta</Label>
          <Textarea id="checkin-resumo" value={resumo} onChange={(e) => setResumo(e.target.value)} />
        </FieldGroup>
        <FieldGroup>
          <Label htmlFor="checkin-pontuacao">Pontuação (opcional)</Label>
          <Input id="checkin-pontuacao" type="number" value={pontuacao} onChange={(e) => setPontuacao(e.target.value)} />
        </FieldGroup>
        <p className="text-xs text-muted">A Clara só organiza a resposta — a leitura clínica é sempre do nutricionista.</p>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={saving}>
            Registrar resposta
          </Button>
        </div>
      </form>
    </Modal>
  );
}
