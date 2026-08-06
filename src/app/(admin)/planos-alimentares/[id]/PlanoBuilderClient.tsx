"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Download, CheckCircle2, RotateCcw, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Tabs } from "@/components/ui/Tabs";
import { MacroSummary } from "@/components/ui/MacroSummary";
import { Label, FieldGroup, Input, Textarea } from "@/components/ui/Input";
import { useToast } from "@/contexts/ToastContext";
import { arredondarMacros } from "@/lib/nutrition/calcular-macros";
import {
  updatePlanoMetasAction,
  finalizarPlanoAction,
  reabrirPlanoAction,
  gerarRascunhoPlanoAction,
} from "@/services/planos-estruturados.actions";
import { exportarPlanoPdfAction } from "@/services/planos-pdf.actions";
import type { PlanoEstruturadoCompleto } from "@/services/planos-estruturados.queries";
import { RefeicaoTab, macrosDaRefeicao } from "./RefeicaoTab";

export function PlanoBuilderClient({ plano }: { plano: PlanoEstruturadoCompleto }) {
  const router = useRouter();
  const { toast } = useToast();
  const refeicoesOrdenadas = useMemo(() => [...plano.refeicoes].sort((a, b) => a.ordem - b.ordem), [plano.refeicoes]);

  const [tab, setTab] = useState(refeicoesOrdenadas[0]?.id ?? "");
  const [titulo, setTitulo] = useState(plano.titulo ?? "");
  const [observacoes, setObservacoes] = useState(plano.observacoes ?? "");
  const [instrucoesIA, setInstrucoesIA] = useState(plano.instrucoes_ia ?? "");
  const [metaKcal, setMetaKcal] = useState(plano.meta_kcal?.toString() ?? "");
  const [metaProteina, setMetaProteina] = useState(plano.meta_proteina_g?.toString() ?? "");
  const [metaCarboidrato, setMetaCarboidrato] = useState(plano.meta_carboidrato_g?.toString() ?? "");
  const [metaGordura, setMetaGordura] = useState(plano.meta_gordura_g?.toString() ?? "");
  const [savingMetas, setSavingMetas] = useState(false);
  const [finalizando, setFinalizando] = useState(false);
  const [exportando, setExportando] = useState(false);
  const [gerandoRascunho, setGerandoRascunho] = useState(false);

  const totalItens = useMemo(() => refeicoesOrdenadas.reduce((acc, r) => acc + r.itens.length, 0), [refeicoesOrdenadas]);

  function refresh() {
    router.refresh();
  }

  const totaisDia = useMemo(() => {
    const somas = refeicoesOrdenadas.reduce(
      (acc, r) => {
        const m = macrosDaRefeicao(r);
        return {
          kcal: acc.kcal + m.kcal,
          proteina_g: acc.proteina_g + m.proteina_g,
          carboidrato_g: acc.carboidrato_g + m.carboidrato_g,
          gordura_g: acc.gordura_g + m.gordura_g,
        };
      },
      { kcal: 0, proteina_g: 0, carboidrato_g: 0, gordura_g: 0 },
    );
    return arredondarMacros(somas);
  }, [refeicoesOrdenadas]);

  const refeicaoAtiva = refeicoesOrdenadas.find((r) => r.id === tab) ?? refeicoesOrdenadas[0];
  const editavel = plano.status !== "finalizado";

  async function handleSalvarMetas(e: React.FormEvent) {
    e.preventDefault();
    setSavingMetas(true);
    const result = await updatePlanoMetasAction(plano.id, {
      titulo,
      observacoes,
      instrucoes_ia: instrucoesIA,
      meta_kcal: metaKcal ? Number(metaKcal) : undefined,
      meta_proteina_g: metaProteina ? Number(metaProteina) : undefined,
      meta_carboidrato_g: metaCarboidrato ? Number(metaCarboidrato) : undefined,
      meta_gordura_g: metaGordura ? Number(metaGordura) : undefined,
    });
    setSavingMetas(false);
    toast({ kind: result.success ? "success" : "error", title: result.message });
    if (result.success) refresh();
  }

  async function handleFinalizar() {
    setFinalizando(true);
    const result = plano.status === "finalizado" ? await reabrirPlanoAction(plano.id) : await finalizarPlanoAction(plano.id);
    setFinalizando(false);
    toast({ kind: result.success ? "success" : "error", title: result.message });
    if (result.success) refresh();
  }

  async function handleExportar() {
    setExportando(true);
    const result = await exportarPlanoPdfAction(plano.id);
    setExportando(false);
    toast({ kind: result.success ? "success" : "error", title: result.message });
    if (result.success) refresh();
  }

  async function handleGerarRascunho() {
    setGerandoRascunho(true);
    const result = await gerarRascunhoPlanoAction(plano.id);
    setGerandoRascunho(false);
    toast({ kind: result.success ? "success" : "error", title: result.message });
    if (result.success) refresh();
  }

  return (
    <div>
      <Link href="/planos-alimentares" className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink">
        <ArrowLeft className="size-4" /> Planos Alimentares
      </Link>

      <PageHeader
        title={plano.titulo || "Plano estruturado"}
        description={`${plano.paciente?.nome ?? "Paciente"} · ${plano.protocolo?.nome ?? "Protocolo"}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={plano.status === "finalizado" ? "success" : "brand"}>
              {plano.status === "finalizado" ? "Finalizado" : "Rascunho"}
            </Badge>
            {editavel && totalItens === 0 && (
              <Button variant="outline" loading={gerandoRascunho} onClick={handleGerarRascunho} title="Só disponível enquanto o plano está vazio">
                <Sparkles className="size-4" /> Gerar rascunho com IA
              </Button>
            )}
            <Button variant="outline" loading={exportando} onClick={handleExportar}>
              <Download className="size-4" /> Exportar PDF
            </Button>
            <Button variant={plano.status === "finalizado" ? "outline" : "primary"} loading={finalizando} onClick={handleFinalizar}>
              {plano.status === "finalizado" ? (
                <>
                  <RotateCcw className="size-4" /> Reabrir
                </>
              ) : (
                <>
                  <CheckCircle2 className="size-4" /> Finalizar plano
                </>
              )}
            </Button>
          </div>
        }
      />

      <div className="mb-6 flex flex-col gap-4 rounded-lg border border-border bg-surface p-4">
        <form onSubmit={handleSalvarMetas} className="flex flex-col gap-3">
          <FieldGroup>
            <Label>Título</Label>
            <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} disabled={!editavel} />
          </FieldGroup>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <FieldGroup>
              <Label>Meta kcal</Label>
              <Input type="number" value={metaKcal} onChange={(e) => setMetaKcal(e.target.value)} disabled={!editavel} />
            </FieldGroup>
            <FieldGroup>
              <Label>Proteína (g)</Label>
              <Input type="number" value={metaProteina} onChange={(e) => setMetaProteina(e.target.value)} disabled={!editavel} />
            </FieldGroup>
            <FieldGroup>
              <Label>Carboidrato (g)</Label>
              <Input type="number" value={metaCarboidrato} onChange={(e) => setMetaCarboidrato(e.target.value)} disabled={!editavel} />
            </FieldGroup>
            <FieldGroup>
              <Label>Gordura (g)</Label>
              <Input type="number" value={metaGordura} onChange={(e) => setMetaGordura(e.target.value)} disabled={!editavel} />
            </FieldGroup>
          </div>
          <FieldGroup>
            <Label htmlFor="observacoes">Observações para o paciente</Label>
            <Textarea
              id="observacoes"
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              disabled={!editavel}
              placeholder="Orientações finais do plano — entram no PDF exportado."
            />
          </FieldGroup>
          <FieldGroup>
            <Label htmlFor="instrucoes_ia">Instruções extras para a IA</Label>
            <Textarea
              id="instrucoes_ia"
              value={instrucoesIA}
              onChange={(e) => setInstrucoesIA(e.target.value)}
              disabled={!editavel}
              placeholder="ex.: paciente treina em jejum, prefere refeições práticas, evitar peixe..."
            />
          </FieldGroup>
          {editavel && (
            <Button type="submit" size="sm" loading={savingMetas} className="w-fit">
              Salvar
            </Button>
          )}
        </form>

        <MacroSummary label="Total do dia" realizado={totaisDia} meta={{
          kcal: plano.meta_kcal ?? undefined,
          proteina_g: plano.meta_proteina_g ?? undefined,
          carboidrato_g: plano.meta_carboidrato_g ?? undefined,
          gordura_g: plano.meta_gordura_g ?? undefined,
        }} compact />
      </div>

      {refeicoesOrdenadas.length === 0 ? (
        <p className="text-muted">Este protocolo não tem horários de refeição configurados.</p>
      ) : (
        <>
          <Tabs
            className="mb-4"
            value={tab || (refeicoesOrdenadas[0]?.id ?? "")}
            onChange={setTab}
            items={refeicoesOrdenadas.map((r) => ({ key: r.id, label: r.nome }))}
          />
          {refeicaoAtiva && <RefeicaoTab refeicao={refeicaoAtiva} planoId={plano.id} editavel={editavel} />}
        </>
      )}
    </div>
  );
}
