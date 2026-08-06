"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Label, FieldGroup, Input, Textarea } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { createPlanoEstruturadoAction } from "@/services/planos-estruturados.actions";
import { useToast } from "@/contexts/ToastContext";

export function NovoPlanoEstruturadoModal({
  open,
  onClose,
  pacientes,
  protocolos,
}: {
  open: boolean;
  onClose: () => void;
  pacientes: { id: string; nome: string }[];
  protocolos: { id: string; nome: string }[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [pacienteId, setPacienteId] = useState("");
  const [protocoloId, setProtocoloId] = useState("");
  const [titulo, setTitulo] = useState("");
  const [metaKcal, setMetaKcal] = useState("");
  const [metaProteina, setMetaProteina] = useState("");
  const [metaCarboidrato, setMetaCarboidrato] = useState("");
  const [metaGordura, setMetaGordura] = useState("");
  const [instrucoesIA, setInstrucoesIA] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setPacienteId("");
    setProtocoloId("");
    setTitulo("");
    setMetaKcal("");
    setMetaProteina("");
    setMetaCarboidrato("");
    setMetaGordura("");
    setInstrucoesIA("");
  }, [open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!pacienteId || !protocoloId) {
      toast({ kind: "error", title: "Escolha o paciente e o protocolo." });
      return;
    }

    setSaving(true);
    const result = await createPlanoEstruturadoAction(pacienteId, protocoloId, {
      titulo: titulo || undefined,
      instrucoes_ia: instrucoesIA || undefined,
      meta_kcal: metaKcal ? Number(metaKcal) : undefined,
      meta_proteina_g: metaProteina ? Number(metaProteina) : undefined,
      meta_carboidrato_g: metaCarboidrato ? Number(metaCarboidrato) : undefined,
      meta_gordura_g: metaGordura ? Number(metaGordura) : undefined,
    });
    setSaving(false);

    if (result.success && result.planoId) {
      toast({ kind: "success", title: result.message });
      onClose();
      router.push(`/planos-alimentares/${result.planoId}`);
    } else {
      toast({ kind: "error", title: "Não foi possível criar o plano", description: result.message });
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Montar plano estruturado" description="Escolha o paciente e o protocolo — as metas são divididas entre os horários automaticamente.">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <FieldGroup>
          <Label htmlFor="paciente">Paciente</Label>
          <Select id="paciente" value={pacienteId} onChange={(e) => setPacienteId(e.target.value)}>
            <option value="">Selecione um paciente</option>
            {pacientes.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </Select>
        </FieldGroup>

        <FieldGroup>
          <Label htmlFor="protocolo">Protocolo</Label>
          <Select id="protocolo" value={protocoloId} onChange={(e) => setProtocoloId(e.target.value)}>
            <option value="">Selecione um protocolo</option>
            {protocolos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </Select>
        </FieldGroup>

        <FieldGroup>
          <Label htmlFor="titulo">Título (opcional)</Label>
          <Input id="titulo" value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="ex.: Plano — Agosto" />
        </FieldGroup>

        <p className="text-sm font-semibold text-ink">Metas diárias (opcional — dá pra ajustar depois)</p>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <FieldGroup>
            <Label>Kcal</Label>
            <Input type="number" value={metaKcal} onChange={(e) => setMetaKcal(e.target.value)} />
          </FieldGroup>
          <FieldGroup>
            <Label>Proteína (g)</Label>
            <Input type="number" value={metaProteina} onChange={(e) => setMetaProteina(e.target.value)} />
          </FieldGroup>
          <FieldGroup>
            <Label>Carboidrato (g)</Label>
            <Input type="number" value={metaCarboidrato} onChange={(e) => setMetaCarboidrato(e.target.value)} />
          </FieldGroup>
          <FieldGroup>
            <Label>Gordura (g)</Label>
            <Input type="number" value={metaGordura} onChange={(e) => setMetaGordura(e.target.value)} />
          </FieldGroup>
        </div>

        <FieldGroup>
          <Label htmlFor="instrucoes_ia">Instruções extras para a IA (opcional)</Label>
          <Textarea
            id="instrucoes_ia"
            value={instrucoesIA}
            onChange={(e) => setInstrucoesIA(e.target.value)}
            placeholder="ex.: paciente treina em jejum, prefere refeições práticas, evitar peixe..."
          />
          <p className="mt-1.5 text-xs text-muted-light">
            Fica salvo com o plano pra quando você usar o gerador de rascunho por IA — a IA nunca decide sozinha, só usa isso como contexto.
          </p>
        </FieldGroup>

        <div className="mt-2 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={saving}>
            Criar e montar
          </Button>
        </div>
      </form>
    </Modal>
  );
}
