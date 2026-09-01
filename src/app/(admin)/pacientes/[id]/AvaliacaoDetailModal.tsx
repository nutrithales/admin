"use client";

import { useEffect, useRef, useState } from "react";
import {
  Activity,
  Calculator,
  Eye,
  FileText,
  HeartPulse,
  Mail,
  Ruler,
  Share2,
  ShieldOff,
  Sparkles,
  Trash2,
  Upload,
  Waves,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Label, FieldGroup, Input, Textarea } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import {
  avaliacaoExtraNumberFields,
  avaliacaoFisicaSchema,
  calculateAvaliacaoMetrics,
  getExtraNumber,
  getExtraText,
  type AvaliacaoFisicaFormValues,
} from "@/utils/validation/avaliacao-fisica";
import {
  createAvaliacaoFisicaAction,
  deleteAvaliacaoFisicaAction,
  updateAvaliacaoFisicaAction,
  uploadBodymetrixPdfAction,
  getBodymetrixSignedUrlAction,
  interpretarBodymetrixAction,
  disponibilizarAvaliacaoAction,
  revogarAvaliacaoAction,
} from "@/services/avaliacoes.actions";
import { useToast } from "@/contexts/ToastContext";
import type { Tables } from "@/types/database.types";

type NumberFieldKey = Exclude<
  keyof AvaliacaoFisicaFormValues,
  "data" | "consulta_id" | "metodo" | "protocolo" | "condicoes_avaliacao" | "observacoes" | "resumo_paciente"
>;

type NumberField = {
  key: NumberFieldKey;
  label: string;
  step?: string;
};

const COMPOSICAO_FIELDS: NumberField[] = [
  { key: "peso_kg", label: "Peso (kg)" },
  { key: "altura_cm", label: "Altura (cm)" },
  { key: "percentual_gordura", label: "Gordura corporal (%)" },
  { key: "massa_magra_kg", label: "Massa magra (kg)" },
  { key: "massa_gorda_kg", label: "Massa gorda (kg)" },
  { key: "massa_muscular_esqueletica_kg", label: "Massa muscular esquelética (kg)" },
  { key: "agua_corporal_percentual", label: "Água corporal (%)" },
  { key: "massa_ossea_kg", label: "Massa óssea (kg)" },
  { key: "gordura_visceral_nivel", label: "Gordura visceral (nível)" },
  { key: "idade_metabolica_anos", label: "Idade metabólica (anos)", step: "1" },
  { key: "taxa_metabolica_basal_kcal", label: "Metabolismo basal (kcal)", step: "1" },
];

const PERIMETROS_FIELDS: NumberField[] = [
  { key: "circunferencia_pescoco_cm", label: "Pescoço (cm)" },
  { key: "circunferencia_ombros_cm", label: "Ombros (cm)" },
  { key: "circunferencia_torax_cm", label: "Tórax (cm)" },
  { key: "circunferencia_cintura_cm", label: "Cintura (cm)" },
  { key: "circunferencia_abdomen_cm", label: "Abdômen (cm)" },
  { key: "circunferencia_quadril_cm", label: "Quadril (cm)" },
  { key: "circunferencia_braco_cm", label: "Braço geral (cm)" },
  { key: "circunferencia_braco_direito_relaxado_cm", label: "Braço D relaxado (cm)" },
  { key: "circunferencia_braco_esquerdo_relaxado_cm", label: "Braço E relaxado (cm)" },
  { key: "circunferencia_braco_direito_contraido_cm", label: "Braço D contraído (cm)" },
  { key: "circunferencia_braco_esquerdo_contraido_cm", label: "Braço E contraído (cm)" },
  { key: "circunferencia_antebraco_direito_cm", label: "Antebraço D (cm)" },
  { key: "circunferencia_antebraco_esquerdo_cm", label: "Antebraço E (cm)" },
  { key: "circunferencia_coxa_cm", label: "Coxa geral (cm)" },
  { key: "circunferencia_coxa_direita_cm", label: "Coxa D (cm)" },
  { key: "circunferencia_coxa_esquerda_cm", label: "Coxa E (cm)" },
  { key: "circunferencia_panturrilha_direita_cm", label: "Panturrilha D (cm)" },
  { key: "circunferencia_panturrilha_esquerda_cm", label: "Panturrilha E (cm)" },
];

const DOBRAS_FIELDS: NumberField[] = [
  { key: "dobra_peitoral_mm", label: "Peitoral (mm)" },
  { key: "dobra_axilar_media_mm", label: "Axilar média (mm)" },
  { key: "dobra_tricipital_mm", label: "Tricipital (mm)" },
  { key: "dobra_subescapular_mm", label: "Subescapular (mm)" },
  { key: "dobra_bicipital_mm", label: "Bicipital (mm)" },
  { key: "dobra_suprailiaca_mm", label: "Supra-ilíaca (mm)" },
  { key: "dobra_abdominal_mm", label: "Abdominal (mm)" },
  { key: "dobra_coxa_mm", label: "Coxa (mm)" },
  { key: "dobra_panturrilha_mm", label: "Panturrilha (mm)" },
];

const VITAIS_FIELDS: NumberField[] = [
  { key: "pressao_sistolica_mmhg", label: "Pressão sistólica (mmHg)", step: "1" },
  { key: "pressao_diastolica_mmhg", label: "Pressão diastólica (mmHg)", step: "1" },
  { key: "frequencia_cardiaca_repouso_bpm", label: "FC de repouso (bpm)", step: "1" },
];

function today() {
  const local = new Date();
  local.setMinutes(local.getMinutes() - local.getTimezoneOffset());
  return local.toISOString().slice(0, 10);
}

function emptyForm(): AvaliacaoFisicaFormValues {
  return {
    data: today(),
    consulta_id: "",
    metodo: "",
    protocolo: "",
    condicoes_avaliacao: "",
    observacoes: "",
    resumo_paciente: "",
  };
}

function formatMetric(value: number | undefined, digits = 1) {
  return value === undefined ? "—" : value.toLocaleString("pt-BR", { maximumFractionDigits: digits, minimumFractionDigits: digits });
}

function FormSection({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: typeof Activity;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-surface p-4 sm:p-5">
      <div className="mb-4 flex items-start gap-3">
        <span className="rounded-lg bg-brand-light p-2 text-brand-dark"><Icon className="size-4" /></span>
        <div>
          <h3 className="text-sm font-bold text-ink">{title}</h3>
          {description && <p className="mt-0.5 text-xs text-muted">{description}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

function MetricTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-bg-alt-2 p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1 text-lg font-bold text-ink">{value}</p>
    </div>
  );
}

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
  const [deleting, setDeleting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [interpreting, setInterpreting] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [enviarEmail, setEnviarEmail] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (avaliacao) {
      const extraNumbers = Object.fromEntries(
        avaliacaoExtraNumberFields.map((key) => [key, getExtraNumber(avaliacao.medidas_extra, key)]),
      ) as Partial<AvaliacaoFisicaFormValues>;

      setValues({
        ...emptyForm(),
        ...extraNumbers,
        data: avaliacao.data.slice(0, 10),
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
        metodo: getExtraText(avaliacao.medidas_extra, "metodo"),
        protocolo: getExtraText(avaliacao.medidas_extra, "protocolo"),
        condicoes_avaliacao: getExtraText(avaliacao.medidas_extra, "condicoes_avaliacao"),
        observacoes: getExtraText(avaliacao.medidas_extra, "observacoes"),
        resumo_paciente: avaliacao.resumo_paciente ?? "",
      });
      setInterpretacaoIa(avaliacao.interpretacao_ia);
      setDisponivel(avaliacao.disponivel_paciente);
      setHasPdf(Boolean(avaliacao.path));
      setPdfPath(avaliacao.path);
    } else {
      setValues(emptyForm());
      setInterpretacaoIa(null);
      setDisponivel(false);
      setHasPdf(false);
      setPdfPath(null);
    }
    setEnviarEmail(false);
  }, [open, avaliacao]);

  function setField<K extends keyof AvaliacaoFisicaFormValues>(key: K, value: AvaliacaoFisicaFormValues[K]) {
    setValues((previous) => ({ ...previous, [key]: value }));
  }

  function renderNumberFields(fields: NumberField[]) {
    return fields.map((field) => (
      <FieldGroup key={field.key}>
        <Label htmlFor={`avaliacao-${field.key}`}>{field.label}</Label>
        <Input
          id={`avaliacao-${field.key}`}
          type="number"
          min="0"
          step={field.step ?? "0.1"}
          inputMode="decimal"
          value={typeof values[field.key] === "number" ? values[field.key] : ""}
          onChange={(event) => setField(field.key, event.target.value === "" ? undefined : Number(event.target.value))}
        />
      </FieldGroup>
    ));
  }

  const calculated = calculateAvaliacaoMetrics(values);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
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

  async function handleDelete() {
    if (!avaliacao) return;
    const confirmed = window.confirm("Excluir esta avaliação física? Esta ação também remove o PDF anexado e não pode ser desfeita.");
    if (!confirmed) return;
    setDeleting(true);
    const result = await deleteAvaliacaoFisicaAction(avaliacao.id, authId);
    setDeleting(false);
    if (result.success) {
      toast({ kind: "success", title: result.message });
      onClose();
      onSaved();
    } else {
      toast({ kind: "error", title: "Não foi possível excluir", description: result.message });
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
    <Modal
      open={open}
      onClose={onClose}
      title={avaliacao ? "Avaliação física completa" : "Nova avaliação física"}
      description="Composição corporal, perímetros, dobras cutâneas, indicadores calculados e histórico no mesmo registro."
      size="xl"
    >
      <div className="flex flex-col gap-5">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <FormSection icon={FileText} title="Dados da avaliação" description="Identifique quando e como as medidas foram coletadas.">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <FieldGroup>
                <Label htmlFor="avaliacao-data">Data</Label>
                <Input id="avaliacao-data" type="date" required value={values.data} onChange={(event) => setField("data", event.target.value)} />
              </FieldGroup>
              <FieldGroup>
                <Label htmlFor="avaliacao-metodo">Método</Label>
                <Select id="avaliacao-metodo" value={values.metodo ?? ""} onChange={(event) => setField("metodo", event.target.value)}>
                  <option value="">Selecione</option>
                  <option value="BodyMetrix (ultrassom)">BodyMetrix (ultrassom)</option>
                  <option value="Bioimpedância">Bioimpedância</option>
                  <option value="Dobras cutâneas">Dobras cutâneas</option>
                  <option value="Perimetria">Perimetria</option>
                  <option value="Combinada">Combinada</option>
                  <option value="Outro">Outro</option>
                </Select>
              </FieldGroup>
              <FieldGroup>
                <Label htmlFor="avaliacao-protocolo">Protocolo / equipamento</Label>
                <Input id="avaliacao-protocolo" value={values.protocolo ?? ""} placeholder="Ex.: BodyMetrix, Pollock 7 dobras" onChange={(event) => setField("protocolo", event.target.value)} />
              </FieldGroup>
            </div>
            <FieldGroup className="mt-4">
              <Label htmlFor="avaliacao-condicoes">Condições da avaliação</Label>
              <Textarea id="avaliacao-condicoes" className="min-h-20" value={values.condicoes_avaliacao ?? ""} placeholder="Horário, jejum, hidratação, treino anterior, ciclo menstrual ou outras condições relevantes." onChange={(event) => setField("condicoes_avaliacao", event.target.value)} />
            </FieldGroup>
          </FormSection>

          <FormSection icon={Activity} title="Composição corporal" description="Preencha apenas os dados disponíveis no método utilizado.">
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">{renderNumberFields(COMPOSICAO_FIELDS)}</div>
          </FormSection>

          <FormSection icon={Calculator} title="Indicadores calculados" description="Calculados automaticamente; não substituem sua interpretação profissional.">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              <MetricTile label="IMC" value={formatMetric(calculated.imc)} />
              <MetricTile label="RCQ" value={formatMetric(calculated.rcq, 2)} />
              <MetricTile label="Cintura/altura" value={formatMetric(calculated.rce, 2)} />
              <MetricTile label="Massa magra" value={`${formatMetric(calculated.massaMagraKg)} kg`} />
              <MetricTile label="Massa gorda" value={`${formatMetric(calculated.massaGordaKg)} kg`} />
            </div>
          </FormSection>

          <FormSection icon={Ruler} title="Perímetros corporais" description="Inclui medidas gerais e comparação entre os lados direito e esquerdo.">
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">{renderNumberFields(PERIMETROS_FIELDS)}</div>
          </FormSection>

          <FormSection icon={Waves} title="Dobras cutâneas" description="Valores em milímetros para avaliações que utilizem adipômetro.">
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">{renderNumberFields(DOBRAS_FIELDS)}</div>
          </FormSection>

          <FormSection icon={HeartPulse} title="Sinais vitais e observações">
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">{renderNumberFields(VITAIS_FIELDS)}</div>
            <FieldGroup className="mt-4">
              <Label htmlFor="avaliacao-observacoes">Observações profissionais</Label>
              <Textarea id="avaliacao-observacoes" value={values.observacoes ?? ""} placeholder="Achados, limitações, assimetrias, postura ou pontos a acompanhar na próxima avaliação." onChange={(event) => setField("observacoes", event.target.value)} />
            </FieldGroup>
          </FormSection>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
            {avaliacao ? (
              <Button type="button" variant="danger" size="sm" loading={deleting} onClick={handleDelete}>
                <Trash2 className="size-4" /> Excluir avaliação
              </Button>
            ) : <span />}
            <Button type="submit" size="sm" loading={saving}>
              {avaliacao ? "Salvar avaliação completa" : "Criar avaliação"}
            </Button>
          </div>
        </form>

        <div className="rounded-xl border border-border p-4 sm:p-5">
          <p className="mb-2 text-sm font-semibold text-ink">Laudo do BodyMetrix</p>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) handleUploadPdf(file);
              event.target.value = "";
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
          {!avaliacao && <p className="mt-2 text-xs text-muted-light">Crie a avaliação primeiro para poder anexar o PDF.</p>}

          {interpretacaoIa && (
            <div className="mt-3 rounded-md bg-bg-alt-2 p-3">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">Interpretação clínica (só você vê)</p>
              <p className="whitespace-pre-wrap text-sm text-ink">{interpretacaoIa}</p>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-border p-4 sm:p-5">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-ink">Resumo para o paciente</p>
            <Badge tone={disponivel ? "success" : "muted"}>{disponivel ? "Disponível para o paciente" : "Privado"}</Badge>
          </div>
          <Textarea aria-label="Resumo da avaliação para o paciente" value={values.resumo_paciente ?? ""} onChange={(event) => setField("resumo_paciente", event.target.value)} placeholder="Escreva ou revise o resumo que o paciente poderá ver, se você liberar." />
          <div className="mt-3 flex flex-wrap items-center gap-3">
            {!disponivel ? (
              <>
                <label className="flex items-center gap-2 text-sm text-ink">
                  <input type="checkbox" checked={enviarEmail} onChange={(event) => setEnviarEmail(event.target.checked)} className="size-4 rounded border-border text-brand focus:ring-brand/30" />
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
          <p className="mt-2 text-xs text-muted-light">Só este resumo pode ser compartilhado. As medidas, o PDF e a interpretação clínica permanecem privados.</p>
        </div>

        <div className="flex justify-end">
          <Button type="button" variant="ghost" onClick={onClose}>Fechar</Button>
        </div>
      </div>
    </Modal>
  );
}
