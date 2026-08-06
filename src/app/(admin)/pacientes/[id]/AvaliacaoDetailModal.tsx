"use client";

import { useEffect, useRef, useState } from "react";
import { Sparkles, Upload, Eye, Mail, ShieldOff, Share2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Label, FieldGroup, Input, Textarea } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import {
  avaliacaoFisicaSchema,
  type AvaliacaoFisicaFormValues,
} from "@/utils/validation/avaliacao-fisica";
import {
  createAvaliacaoFisicaAction,
  updateAvaliacaoFisicaAction,
  uploadBodymetrixPdfAction,
  getBodymetrixSignedUrlAction,
  interpretarBodymetrixAction,
  disponibilizarAvaliacaoAction,
  revogarAvaliacaoAction,
} from "@/services/avaliacoes.actions";
import { useToast } from "@/contexts/ToastContext";
import type { Tables } from "@/types/database.types";

const emptyForm: AvaliacaoFisicaFormValues = {
  consulta_id: "",
  peso_kg: undefined,
  altura_cm: undefined,
  circunferencia_cintura_cm: undefined,
  circunferencia_quadril_cm: undefined,
  circunferencia_braco_cm: undefined,
  circunferencia_coxa_cm: undefined,
  percentual_gordura: undefined,
  massa_magra_kg: undefined,
  massa_gorda_kg: undefined,
  resumo_paciente: "",
};

export function AvaliacaoDetailModal({
  open,
  onClose,
  onSaved,
  authId,
  avaliacao,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  authId: string;
  avaliacao?: Tables<"avaliacoes_fisicas"> | null;
}) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [values, setValues] = useState<AvaliacaoFisicaFormValues>(emptyForm);
  const [interpretacaoIa, setInterpretacaoIa] = useState<string | null>(null);
  const [disponivel, setDisponivel] = useState(false);
  const [hasPdf, setHasPdf] = useState(false);
  const [pdfPath, setPdfPath] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [interpreting, setInterpreting] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [enviarEmail, setEnviarEmail] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (avaliacao) {
      setValues({
        consulta_id: avaliacao.consulta_id ?? "",
        peso_kg: avaliacao.peso_kg ?? undefined,
        altura_cm: avaliacao.altura_cm ?? undefined,
        circunferencia_cintura_cm: avaliacao.circunferencia_cintura_cm ?? undefined,
        circunferencia_quadril_cm: avaliacao.circunferencia_quadril_cm ?? undefined,
        circunferencia_braco_cm: avaliacao.circunferencia_braco_cm ?? undefined,
        circunferencia_coxa_cm: avaliacao.circunferencia_coxa_cm ?? undefined,
        percentual_gordura: avaliacao.percentual_gordura ?? undefined,
        massa_magra_kg: avaliacao.massa_magra_kg ?? undefined,
        massa_gorda_kg: avaliacao.massa_gorda_kg ?? undefined,
        resumo_paciente: avaliacao.resumo_paciente ?? "",
      });
      setInterpretacaoIa(avaliacao.interpretacao_ia);
      setDisponivel(avaliacao.disponivel_paciente);
      setHasPdf(!!avaliacao.path);
      setPdfPath(avaliacao.path);
    } else {
      setValues(emptyForm);
      setInterpretacaoIa(null);
      setDisponivel(false);
      setHasPdf(false);
      setPdfPath(null);
    }
    setEnviarEmail(false);
  }, [open, avaliacao]);

  function setField<K extends keyof AvaliacaoFisicaFormValues>(key: K, value: AvaliacaoFisicaFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = avaliacaoFisicaSchema.safeParse(values);
    if (!parsed.success) {
      toast({ kind: "error", title: parsed.error.issues[0]?.message ?? "Dados inválidos." });
      return;
    }

    setSaving(true);
    const result = avaliacao
      ? await updateAvaliacaoFisicaAction(avaliacao.id, authId, parsed.data)
      : await createAvaliacaoFisicaAction(authId, parsed.data);
    setSaving(false);

    if (result.success) {
      toast({ kind: "success", title: result.message });
      onSaved();
      if (!avaliacao) onClose();
    } else {
      toast({ kind: "error", title: "Não foi possível salvar", description: result.message });
    }
  }

  async function handleUploadPdf(file: File) {
    if (!avaliacao) {
      toast({ kind: "error", title: "Salve a avaliação antes de enviar o PDF." });
      return;
    }
    const formData = new FormData();
    formData.set("arquivo", file);
    setUploading(true);
    const result = await uploadBodymetrixPdfAction(avaliacao.id, authId, formData);
    setUploading(false);
    if (result.success) {
      toast({ kind: "success", title: result.message });
      setHasPdf(true);
      onSaved();
    } else {
      toast({ kind: "error", title: "Erro ao enviar PDF", description: result.message });
    }
  }

  async function handleVerPdf() {
    if (!pdfPath) return;
    const result = await getBodymetrixSignedUrlAction(pdfPath);
    if (result.url) window.open(result.url, "_blank", "noopener,noreferrer");
    else toast({ kind: "error", title: "Erro ao abrir arquivo", description: result.message });
  }

  async function handleInterpretar() {
    if (!avaliacao) return;
    setInterpreting(true);
    const result = await interpretarBodymetrixAction(avaliacao.id, authId);
    setInterpreting(false);
    if (result.success) {
      toast({ kind: "success", title: result.message });
      onSaved();
    } else {
      toast({ kind: "error", title: "Erro ao interpretar", description: result.message });
    }
  }

  async function handleDisponibilizar() {
    if (!avaliacao) return;
    setPublishing(true);
    const result = await disponibilizarAvaliacaoAction(avaliacao.id, authId, { enviarEmail });
    setPublishing(false);
    if (result.success) {
      toast({ kind: "success", title: result.message });
      setDisponivel(true);
      onSaved();
    } else {
      toast({ kind: "error", title: "Não foi possível disponibilizar", description: result.message });
    }
  }

  async function handleRevogar() {
    if (!avaliacao) return;
    setPublishing(true);
    const result = await revogarAvaliacaoAction(avaliacao.id, authId);
    setPublishing(false);
    if (result.success) {
      toast({ kind: "success", title: result.message });
      setDisponivel(false);
      onSaved();
    } else {
      toast({ kind: "error", title: "Erro ao revogar", description: result.message });
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={avaliacao ? "Avaliação física" : "Nova avaliação física"} size="lg">
      <div className="flex flex-col gap-5">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <p className="text-sm font-semibold text-ink">Antropometria</p>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <FieldGroup>
              <Label>Peso (kg)</Label>
              <Input type="number" step="0.1" value={values.peso_kg ?? ""} onChange={(e) => setField("peso_kg", e.target.value === "" ? undefined : Number(e.target.value))} />
            </FieldGroup>
            <FieldGroup>
              <Label>Altura (cm)</Label>
              <Input type="number" step="0.1" value={values.altura_cm ?? ""} onChange={(e) => setField("altura_cm", e.target.value === "" ? undefined : Number(e.target.value))} />
            </FieldGroup>
            <FieldGroup>
              <Label>% Gordura</Label>
              <Input type="number" step="0.1" value={values.percentual_gordura ?? ""} onChange={(e) => setField("percentual_gordura", e.target.value === "" ? undefined : Number(e.target.value))} />
            </FieldGroup>
            <FieldGroup>
              <Label>Cintura (cm)</Label>
              <Input type="number" step="0.1" value={values.circunferencia_cintura_cm ?? ""} onChange={(e) => setField("circunferencia_cintura_cm", e.target.value === "" ? undefined : Number(e.target.value))} />
            </FieldGroup>
            <FieldGroup>
              <Label>Quadril (cm)</Label>
              <Input type="number" step="0.1" value={values.circunferencia_quadril_cm ?? ""} onChange={(e) => setField("circunferencia_quadril_cm", e.target.value === "" ? undefined : Number(e.target.value))} />
            </FieldGroup>
            <FieldGroup>
              <Label>Braço (cm)</Label>
              <Input type="number" step="0.1" value={values.circunferencia_braco_cm ?? ""} onChange={(e) => setField("circunferencia_braco_cm", e.target.value === "" ? undefined : Number(e.target.value))} />
            </FieldGroup>
            <FieldGroup>
              <Label>Coxa (cm)</Label>
              <Input type="number" step="0.1" value={values.circunferencia_coxa_cm ?? ""} onChange={(e) => setField("circunferencia_coxa_cm", e.target.value === "" ? undefined : Number(e.target.value))} />
            </FieldGroup>
            <FieldGroup>
              <Label>Massa magra (kg)</Label>
              <Input type="number" step="0.1" value={values.massa_magra_kg ?? ""} onChange={(e) => setField("massa_magra_kg", e.target.value === "" ? undefined : Number(e.target.value))} />
            </FieldGroup>
            <FieldGroup>
              <Label>Massa gorda (kg)</Label>
              <Input type="number" step="0.1" value={values.massa_gorda_kg ?? ""} onChange={(e) => setField("massa_gorda_kg", e.target.value === "" ? undefined : Number(e.target.value))} />
            </FieldGroup>
          </div>
          <div className="flex justify-end">
            <Button type="submit" size="sm" loading={saving}>
              {avaliacao ? "Salvar antropometria" : "Criar avaliação"}
            </Button>
          </div>
        </form>

        <div className="rounded-lg border border-border p-4">
          <p className="mb-2 text-sm font-semibold text-ink">PDF do Bodymetrix</p>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleUploadPdf(file);
              e.target.value = "";
            }}
          />
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" loading={uploading} onClick={() => fileInputRef.current?.click()} disabled={!avaliacao}>
              <Upload className="size-4" /> {hasPdf ? "Substituir PDF" : "Enviar PDF"}
            </Button>
            {hasPdf && (
              <Button type="button" variant="ghost" size="sm" onClick={handleVerPdf}>
                <Eye className="size-4" /> Ver PDF
              </Button>
            )}
            <Button type="button" variant="ghost" size="sm" loading={interpreting} onClick={handleInterpretar} disabled={!hasPdf}>
              <Sparkles className="size-4" /> Interpretar com IA
            </Button>
          </div>
          {!avaliacao && <p className="mt-2 text-xs text-muted-light">Salve a avaliação primeiro para poder anexar o PDF.</p>}

          {interpretacaoIa && (
            <div className="mt-3 rounded-md bg-bg-alt-2 p-3">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">Interpretação clínica (só você vê)</p>
              <p className="whitespace-pre-wrap text-sm text-ink">{interpretacaoIa}</p>
            </div>
          )}
        </div>

        <div className="rounded-lg border border-border p-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold text-ink">Resumo para o paciente</p>
            <Badge tone={disponivel ? "success" : "muted"}>{disponivel ? "Disponível para o paciente" : "Privado"}</Badge>
          </div>
          <Textarea
            value={values.resumo_paciente}
            onChange={(e) => setField("resumo_paciente", e.target.value)}
            placeholder="Escreva (ou revise o rascunho gerado pela IA) o resumo que o paciente poderá ver, se você liberar."
          />
          <div className="mt-3 flex flex-wrap items-center gap-3">
            {!disponivel ? (
              <>
                <label className="flex items-center gap-2 text-sm text-ink">
                  <input type="checkbox" checked={enviarEmail} onChange={(e) => setEnviarEmail(e.target.checked)} className="size-4 rounded border-border text-brand focus:ring-brand/30" />
                  <Mail className="size-4" /> Também enviar por e-mail agora
                </label>
                <Button type="button" size="sm" loading={publishing} onClick={handleDisponibilizar} disabled={!avaliacao}>
                  <Share2 className="size-4" /> Disponibilizar para o paciente
                </Button>
              </>
            ) : (
              <Button type="button" variant="outline" size="sm" loading={publishing} onClick={handleRevogar}>
                <ShieldOff className="size-4" /> Revogar acesso do paciente
              </Button>
            )}
          </div>
          <p className="mt-2 text-xs text-muted-light">
            Só este resumo pode ficar visível ao paciente — antropometria, PDF e a interpretação clínica completa nunca são
            compartilhados.
          </p>
        </div>

        <div className="flex justify-end">
          <Button type="button" variant="ghost" onClick={onClose}>
            Fechar
          </Button>
        </div>
      </div>
    </Modal>
  );
}
