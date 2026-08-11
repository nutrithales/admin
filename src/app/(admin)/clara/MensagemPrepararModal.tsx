"use client";

import { useEffect, useState } from "react";
import { Copy } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Label, FieldGroup, Textarea } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useToast } from "@/contexts/ToastContext";
import { prepararMensagemAction } from "@/services/clara.actions";
import type { Tables } from "@/types/database.types";

export interface MensagemPrepararModalProps {
  open: boolean;
  onClose: () => void;
  pacientes: { id: string; nome: string | null }[];
  modelos: Tables<"mensagens_modelos">[];
  pacienteInicial?: string | null;
}

export function MensagemPrepararModal({
  open,
  onClose,
  pacientes,
  modelos,
  pacienteInicial,
}: MensagemPrepararModalProps) {
  const { toast } = useToast();
  const [pacienteId, setPacienteId] = useState(pacienteInicial ?? "");
  const [chaveModelo, setChaveModelo] = useState(modelos[0]?.chave ?? "");
  const [corpo, setCorpo] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setPacienteId(pacienteInicial ?? "");
      setCorpo("");
    }
  }, [open, pacienteInicial]);

  async function gerar() {
    if (!pacienteId || !chaveModelo) {
      toast({ kind: "error", title: "Selecione o paciente e o modelo de mensagem." });
      return;
    }
    setLoading(true);
    const result = await prepararMensagemAction(pacienteId, chaveModelo);
    setLoading(false);
    if (result.erro) {
      toast({ kind: "error", title: result.erro });
      return;
    }
    setCorpo(result.corpo);
  }

  async function copiar() {
    await navigator.clipboard.writeText(corpo);
    toast({ kind: "success", title: "Mensagem copiada." });
  }

  return (
    <Modal open={open} onClose={onClose} title="Preparar mensagem" description="Revise antes de enviar — a Clara nunca envia mensagens automaticamente.">
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <FieldGroup>
            <Label htmlFor="mensagem-paciente">Paciente</Label>
            <Select id="mensagem-paciente" value={pacienteId} onChange={(e) => setPacienteId(e.target.value)}>
              <option value="">Selecione um paciente</option>
              {pacientes.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome}
                </option>
              ))}
            </Select>
          </FieldGroup>
          <FieldGroup>
            <Label htmlFor="mensagem-modelo">Modelo</Label>
            <Select id="mensagem-modelo" value={chaveModelo} onChange={(e) => setChaveModelo(e.target.value)}>
              {modelos.map((m) => (
                <option key={m.chave} value={m.chave}>
                  {m.titulo}
                </option>
              ))}
            </Select>
          </FieldGroup>
        </div>
        <Button type="button" variant="outline" onClick={gerar} loading={loading}>
          Gerar mensagem
        </Button>
        {corpo && (
          <FieldGroup>
            <Label htmlFor="mensagem-corpo">Mensagem</Label>
            <Textarea id="mensagem-corpo" value={corpo} onChange={(e) => setCorpo(e.target.value)} className="min-h-32" />
            <Button type="button" variant="secondary" className="mt-2 self-end" onClick={copiar}>
              <Copy className="size-4" /> Copiar
            </Button>
          </FieldGroup>
        )}
      </div>
    </Modal>
  );
}
