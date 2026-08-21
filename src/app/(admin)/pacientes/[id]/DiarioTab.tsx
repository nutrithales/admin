"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { BookOpen, CheckCircle2, RefreshCw, ToggleLeft, ToggleRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";

type Config = { id: string; titulo: string; targets: any; meal_data: any; ativo: boolean };

type Food = { id: string; nome: string; kcal_100g: number | string | null; proteina_100g: number | string | null; carboidrato_100g: number | string | null; gordura_100g: number | string | null };
type Item = { plano_refeicao_id: string; alimento_id: string | null; quantidade_g: number | string | null; opcao_numero: number | null; opcao_nome: string | null; contabiliza_macros: boolean | null; ordem: number | null };

function n(value: unknown) { return Number(value || 0); }
function r(value: number) { return Math.round(value * 10) / 10; }

export function DiarioTab({ pacienteId, authId }: { pacienteId: string; authId: string | null }) {
  const supabase = useMemo(() => createClient() as any, []);
  const [enabled, setEnabled] = useState(false);
  const [config, setConfig] = useState<Config | null>(null);
  const [records, setRecords] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: patient }, { data: cfg }, { count }] = await Promise.all([
      supabase.from("pacientes").select("diario_liberado").eq("id", pacienteId).maybeSingle(),
      supabase.from("diario_configuracoes").select("id,titulo,targets,meal_data,ativo").eq("paciente_id", pacienteId).maybeSingle(),
      supabase.from("diario_registros").select("id", { count: "exact", head: true }).eq("paciente_id", pacienteId),
    ]);
    setEnabled(Boolean(patient?.diario_liberado));
    setConfig(cfg || null);
    setRecords(Number(count || 0));
    setLoading(false);
  }, [pacienteId, supabase]);

  useEffect(() => { void load(); }, [load]);

  async function toggle() {
    setBusy(true); setMessage("");
    const next = !enabled;
    if (next && !config) {
      setBusy(false);
      setMessage("Crie a configuração do Diário antes de liberar para o paciente.");
      return;
    }
    const { error } = await supabase.from("pacientes").update({ diario_liberado: next }).eq("id", pacienteId);
    setBusy(false);
    if (error) { setMessage("Não foi possível alterar a liberação."); return; }
    setEnabled(next);
    setMessage(next ? "Diário liberado para o paciente." : "Diário ocultado da área do paciente.");
  }

  async function generateFromPlan() {
    if (!authId) { setMessage("Este paciente ainda não possui acesso autenticado à área do paciente."); return; }
    setBusy(true); setMessage("");
    try {
      const { data: planLink } = await supabase
        .from("planos_alimentares")
        .select("plano_estruturado_id,titulo,data_envio")
        .eq("auth_id", authId)
        .eq("ativo", true)
        .not("plano_estruturado_id", "is", null)
        .order("data_envio", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!planLink?.plano_estruturado_id) throw new Error("O plano alimentar ativo ainda não está no formato estruturado. O Diário pode ser configurado quando o plano estiver estruturado no Dashboard.");

      const [{ data: plan }, { data: meals }] = await Promise.all([
        supabase.from("planos_estruturados").select("id,titulo,meta_kcal,meta_proteina_g,meta_carboidrato_g,meta_gordura_g").eq("id", planLink.plano_estruturado_id).single(),
        supabase.from("plano_refeicoes").select("id,nome,ordem,meta_kcal,meta_proteina_g,meta_carboidrato_g,meta_gordura_g").eq("plano_estruturado_id", planLink.plano_estruturado_id).order("ordem"),
      ]);
      if (!plan || !meals?.length) throw new Error("Não encontrei as refeições do plano estruturado.");

      const mealIds = meals.map((m: any) => m.id);
      const { data: itemsData } = await supabase.from("plano_refeicao_itens").select("plano_refeicao_id,alimento_id,quantidade_g,opcao_numero,opcao_nome,contabiliza_macros,ordem").in("plano_refeicao_id", mealIds).order("ordem");
      const items = (itemsData || []) as Item[];
      const foodIds = [...new Set(items.map((i) => i.alimento_id).filter(Boolean))] as string[];
      const { data: foodsData } = foodIds.length ? await supabase.from("alimentos").select("id,nome,kcal_100g,proteina_100g,carboidrato_100g,gordura_100g").in("id", foodIds) : { data: [] };
      const foods = new Map<string, Food>((foodsData || []).map((f: Food) => [f.id, f]));

      const mealData: Record<string, any> = {};
      for (const meal of meals as any[]) {
        const mealItems = items.filter((i) => i.plano_refeicao_id === meal.id);
        const optionNumbers = [...new Set(mealItems.map((i) => Number(i.opcao_numero || 1)))].sort((a, b) => a - b);
        const options = optionNumbers.map((optionNumber) => {
          const optionItems = mealItems.filter((i) => Number(i.opcao_numero || 1) === optionNumber);
          const macro = { kcal: 0, p: 0, c: 0, f: 0 };
          const parts: string[] = [];
          for (const item of optionItems) {
            const food = item.alimento_id ? foods.get(item.alimento_id) : null;
            const grams = n(item.quantidade_g);
            if (food) {
              parts.push(`${r(grams)}g ${food.nome}`);
              if (item.contabiliza_macros !== false) {
                macro.kcal += n(food.kcal_100g) * grams / 100;
                macro.p += n(food.proteina_100g) * grams / 100;
                macro.c += n(food.carboidrato_100g) * grams / 100;
                macro.f += n(food.gordura_100g) * grams / 100;
              }
            }
          }
          const optionName = optionItems.find((i) => i.opcao_nome)?.opcao_nome;
          const prefix = optionName ? `Opção ${optionNumber} · ${optionName}` : `Opção ${optionNumber}`;
          return { id: `opt_${optionNumber}`, label: parts.length ? `${prefix} — ${parts.join(" + ")}` : prefix, kcal: r(macro.kcal || n(meal.meta_kcal)), p: r(macro.p || n(meal.meta_proteina_g)), c: r(macro.c || n(meal.meta_carboidrato_g)), f: r(macro.f || n(meal.meta_gordura_g)) };
        });
        mealData[`meal_${meal.id}`] = { title: meal.nome || "Refeição", options };
      }

      const targets = { kcal: n(plan.meta_kcal), p: n(plan.meta_proteina_g), c: n(plan.meta_carboidrato_g), f: n(plan.meta_gordura_g) };
      const { error: saveError } = await supabase.from("diario_configuracoes").upsert({ paciente_id: pacienteId, titulo: "Diário alimentar", targets, meal_data: mealData, ativo: true }, { onConflict: "paciente_id" });
      if (saveError) throw new Error("Não foi possível salvar a configuração do Diário.");
      await supabase.from("pacientes").update({ diario_liberado: true }).eq("id", pacienteId);
      setMessage(`Diário gerado a partir de “${plan.titulo || planLink.titulo || "plano atual"}” e liberado.`);
      await load();
    } catch (e: any) {
      setMessage(e?.message || "Não foi possível gerar o Diário.");
    } finally { setBusy(false); }
  }

  if (loading) return <Card><CardContent className="py-8 text-sm text-muted">Carregando Diário…</CardContent></Card>;

  const mealCount = config?.meal_data ? Object.keys(config.meal_data).length : 0;
  return <div className="space-y-4">
    <Card><CardContent className="pt-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-3"><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-light text-brand-dark"><BookOpen className="size-5" /></span><div><h3 className="font-bold text-ink">Diário alimentar universal</h3><p className="mt-1 max-w-xl text-sm text-muted">Usa o mesmo Dashboard para todos os pacientes. Cada um visualiza apenas o próprio plano, metas e histórico.</p></div></div>
        <Button type="button" variant={enabled ? "outline" : "primary"} onClick={toggle} loading={busy} disabled={!config}>{enabled ? <ToggleRight className="size-4" /> : <ToggleLeft className="size-4" />}{enabled ? "Desativar Diário" : "Liberar Diário"}</Button>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl bg-bg-alt p-3"><p className="text-xs font-semibold text-muted">Status</p><p className={`mt-1 font-bold ${enabled ? "text-emerald-700" : "text-muted"}`}>{enabled ? "Liberado" : "Oculto"}</p></div>
        <div className="rounded-xl bg-bg-alt p-3"><p className="text-xs font-semibold text-muted">Refeições configuradas</p><p className="mt-1 font-bold text-ink">{mealCount}</p></div>
        <div className="rounded-xl bg-bg-alt p-3"><p className="text-xs font-semibold text-muted">Dias registrados</p><p className="mt-1 font-bold text-ink">{records}</p></div>
      </div>
    </CardContent></Card>

    <Card><CardContent className="pt-6"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><h3 className="font-bold text-ink">Sincronizar com o plano alimentar</h3><p className="mt-1 text-sm text-muted">Lê o plano estruturado ativo, cria as refeições e opções com seus próprios macros e usa as metas nutricionais daquele paciente.</p></div><Button type="button" onClick={generateFromPlan} loading={busy}><RefreshCw className="size-4" />{config ? "Atualizar pelo plano" : "Gerar pelo plano"}</Button></div>
      {config ? <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"><CheckCircle2 className="size-4" /> Configuração existente. Atualizar pelo plano não apaga os dias já registrados.</div> : null}
      {message ? <p className={`mt-4 rounded-xl p-3 text-sm ${message.includes("não") || message.includes("ainda") || message.includes("Não") ? "bg-amber-50 text-amber-900" : "bg-emerald-50 text-emerald-800"}`}>{message}</p> : null}
    </CardContent></Card>
  </div>;
}
