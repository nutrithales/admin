"use server";

import { revalidatePath } from "next/cache";
import { assertAdmin } from "@/lib/supabase/assert-admin";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/services/pacientes.actions";
import { scaleRecipe, type ItemParaEscalar, type MetaEscala } from "@/lib/nutrition/scale-recipe";
import { calcularMacrosTotais } from "@/lib/nutrition/calcular-macros";

export interface PlanoMetasValues {
  titulo?: string;
  observacoes?: string;
  meta_kcal?: number;
  meta_proteina_g?: number;
  meta_carboidrato_g?: number;
  meta_gordura_g?: number;
}

interface CreatePlanoResult extends ActionResult {
  planoId?: string;
}

function revalidatePlano(planoId: string) {
  revalidatePath(`/planos-alimentares/${planoId}`);
  revalidatePath("/planos-alimentares");
}

export async function createPlanoEstruturadoAction(
  authId: string,
  protocoloId: string,
  metas: PlanoMetasValues,
): Promise<CreatePlanoResult> {
  await assertAdmin();
  const supabase = await createClient();

  const { data: slots, error: slotsError } = await supabase
    .from("protocolo_refeicoes")
    .select("nome, ordem, percentual_kcal")
    .eq("protocolo_id", protocoloId)
    .order("ordem", { ascending: true });

  if (slotsError) return { success: false, message: `Erro ao carregar o protocolo: ${slotsError.message}` };
  if (!slots || slots.length === 0) {
    return { success: false, message: "Este protocolo não tem horários de refeição cadastrados." };
  }

  const { data: plano, error: planoError } = await supabase
    .from("planos_estruturados")
    .insert({
      auth_id: authId,
      protocolo_id: protocoloId,
      titulo: metas.titulo || null,
      meta_kcal: metas.meta_kcal ?? null,
      meta_proteina_g: metas.meta_proteina_g ?? null,
      meta_carboidrato_g: metas.meta_carboidrato_g ?? null,
      meta_gordura_g: metas.meta_gordura_g ?? null,
    })
    .select("id")
    .single();

  if (planoError || !plano) return { success: false, message: `Erro ao criar plano: ${planoError?.message}` };

  const linhas = slots.map((slot) => {
    const fracao = slot.percentual_kcal != null ? slot.percentual_kcal / 100 : null;
    const proporcional = (total?: number) => (fracao != null && total ? Math.round(total * fracao) : null);
    return {
      plano_estruturado_id: plano.id,
      nome: slot.nome,
      ordem: slot.ordem,
      meta_kcal: proporcional(metas.meta_kcal),
      meta_proteina_g: proporcional(metas.meta_proteina_g),
      meta_carboidrato_g: proporcional(metas.meta_carboidrato_g),
      meta_gordura_g: proporcional(metas.meta_gordura_g),
    };
  });

  const { error: refeicoesError } = await supabase.from("plano_refeicoes").insert(linhas);
  if (refeicoesError) {
    await supabase.from("planos_estruturados").delete().eq("id", plano.id);
    return { success: false, message: `Erro ao criar as refeições do plano: ${refeicoesError.message}` };
  }

  revalidatePath("/planos-alimentares");
  return { success: true, message: "Plano criado.", planoId: plano.id };
}

export async function updatePlanoMetasAction(id: string, metas: PlanoMetasValues): Promise<ActionResult> {
  await assertAdmin();
  const supabase = await createClient();

  const { error } = await supabase
    .from("planos_estruturados")
    .update({
      titulo: metas.titulo || null,
      observacoes: metas.observacoes || null,
      meta_kcal: metas.meta_kcal ?? null,
      meta_proteina_g: metas.meta_proteina_g ?? null,
      meta_carboidrato_g: metas.meta_carboidrato_g ?? null,
      meta_gordura_g: metas.meta_gordura_g ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) return { success: false, message: `Erro ao atualizar metas: ${error.message}` };

  revalidatePlano(id);
  return { success: true, message: "Metas atualizadas." };
}

export async function updateMetaRefeicaoAction(
  planoRefeicaoId: string,
  planoId: string,
  metas: Omit<PlanoMetasValues, "titulo">,
): Promise<ActionResult> {
  await assertAdmin();
  const supabase = await createClient();

  const { error } = await supabase
    .from("plano_refeicoes")
    .update({
      meta_kcal: metas.meta_kcal ?? null,
      meta_proteina_g: metas.meta_proteina_g ?? null,
      meta_carboidrato_g: metas.meta_carboidrato_g ?? null,
      meta_gordura_g: metas.meta_gordura_g ?? null,
    })
    .eq("id", planoRefeicaoId);

  if (error) return { success: false, message: `Erro ao atualizar meta da refeição: ${error.message}` };

  revalidatePlano(planoId);
  return { success: true, message: "Meta da refeição atualizada." };
}

/** Soma o que já está montado numa refeição do plano (itens avulsos +
 * ingredientes materializados de receitas) — usado pra escalar uma nova
 * receita contra o que AINDA falta pra bater a meta do slot, não a meta
 * inteira (senão cada receita nova ignoraria o que já foi adicionado). */
async function calcularRealizadoRefeicao(
  supabase: Awaited<ReturnType<typeof createClient>>,
  planoRefeicaoId: string,
) {
  const { data: itens } = await supabase
    .from("plano_refeicao_itens")
    .select(
      "id, quantidade_g, alimento:alimentos(kcal_100g, proteina_100g, carboidrato_100g, gordura_100g), ingredientes:plano_refeicao_item_ingredientes(quantidade_g_final, alimento:alimentos(kcal_100g, proteina_100g, carboidrato_100g, gordura_100g))",
    )
    .eq("plano_refeicao_id", planoRefeicaoId);

  type Macro = { kcal_100g: number; proteina_100g: number; carboidrato_100g: number; gordura_100g: number };
  const partes: { quantidade_g: number; alimento: Macro }[] = [];

  for (const item of itens ?? []) {
    const alimentoAvulso = item.alimento as unknown as Macro | null;
    if (alimentoAvulso && item.quantidade_g) {
      partes.push({ quantidade_g: item.quantidade_g, alimento: alimentoAvulso });
    }
    const ingredientes = (item.ingredientes ?? []) as unknown as { quantidade_g_final: number; alimento: Macro }[];
    for (const ing of ingredientes) {
      partes.push({ quantidade_g: ing.quantidade_g_final, alimento: ing.alimento });
    }
  }

  return calcularMacrosTotais(partes);
}

export interface AdicionarReceitaResult extends ActionResult {
  avisos?: string[];
}

interface ReceitaItemParaEscala {
  id: string;
  alimento_id: string;
  quantidade_base_g: number;
  papel_macro: string;
  alimento: { kcal_100g: number; proteina_100g: number; carboidrato_100g: number; gordura_100g: number };
}

export async function addReceitaAoPlanoAction(planoRefeicaoId: string, planoId: string, receitaId: string): Promise<AdicionarReceitaResult> {
  await assertAdmin();
  const supabase = await createClient();

  const [{ data: slot, error: slotError }, { data: receita, error: receitaError }, { count: ordemAtual }] = await Promise.all([
    supabase.from("plano_refeicoes").select("meta_proteina_g, meta_carboidrato_g, meta_gordura_g").eq("id", planoRefeicaoId).single(),
    supabase
      .from("receitas")
      .select("id, itens:receita_itens(*, alimento:alimentos(id, nome, kcal_100g, proteina_100g, carboidrato_100g, gordura_100g))")
      .eq("id", receitaId)
      .single(),
    supabase.from("plano_refeicao_itens").select("id", { count: "exact", head: true }).eq("plano_refeicao_id", planoRefeicaoId),
  ]);

  if (slotError || !slot) return { success: false, message: "Refeição do plano não encontrada." };
  if (receitaError || !receita) return { success: false, message: "Receita não encontrada." };

  const itensReceita = (receita.itens ?? []) as unknown as ReceitaItemParaEscala[];
  if (itensReceita.length === 0) return { success: false, message: "Esta receita não tem ingredientes." };

  const realizado = await calcularRealizadoRefeicao(supabase, planoRefeicaoId);

  const meta: MetaEscala = {
    proteina_g: slot.meta_proteina_g != null ? Math.max(0, slot.meta_proteina_g - realizado.proteina_g) : undefined,
    carboidrato_g: slot.meta_carboidrato_g != null ? Math.max(0, slot.meta_carboidrato_g - realizado.carboidrato_g) : undefined,
    gordura_g: slot.meta_gordura_g != null ? Math.max(0, slot.meta_gordura_g - realizado.gordura_g) : undefined,
  };

  const alimentoIdPorItem = new Map(itensReceita.map((item) => [item.id, item.alimento_id]));
  const itensParaEscalar: ItemParaEscalar[] = itensReceita.map((item) => ({
    id: item.id,
    quantidade_base_g: item.quantidade_base_g,
    papel_macro: (item.papel_macro as ItemParaEscalar["papel_macro"]) ?? "livre",
    alimento: item.alimento,
  }));

  const resultado = scaleRecipe(itensParaEscalar, meta);

  const { data: itemRow, error: itemError } = await supabase
    .from("plano_refeicao_itens")
    .insert({ plano_refeicao_id: planoRefeicaoId, receita_id: receitaId, ordem: ordemAtual ?? 0 })
    .select("id")
    .single();

  if (itemError || !itemRow) return { success: false, message: `Erro ao adicionar receita: ${itemError?.message}` };

  const { error: ingredientesError } = await supabase.from("plano_refeicao_item_ingredientes").insert(
    resultado.itens.map((ie, i) => ({
      plano_refeicao_item_id: itemRow.id,
      alimento_id: alimentoIdPorItem.get(ie.id)!,
      quantidade_g_final: ie.quantidade_final_g,
      receita_item_id: ie.id,
      ordem: i,
    })),
  );

  if (ingredientesError) {
    await supabase.from("plano_refeicao_itens").delete().eq("id", itemRow.id);
    return { success: false, message: `Erro ao montar ingredientes: ${ingredientesError.message}` };
  }

  revalidatePlano(planoId);
  return { success: true, message: "Receita adicionada e escalada.", avisos: resultado.avisos };
}

export async function addAlimentoAvulsoAoPlanoAction(
  planoRefeicaoId: string,
  planoId: string,
  alimentoId: string,
  quantidadeG: number,
): Promise<ActionResult> {
  await assertAdmin();
  const supabase = await createClient();

  const { count: ordemAtual } = await supabase
    .from("plano_refeicao_itens")
    .select("id", { count: "exact", head: true })
    .eq("plano_refeicao_id", planoRefeicaoId);

  const { error } = await supabase.from("plano_refeicao_itens").insert({
    plano_refeicao_id: planoRefeicaoId,
    alimento_id: alimentoId,
    quantidade_g: quantidadeG,
    ordem: ordemAtual ?? 0,
  });

  if (error) return { success: false, message: `Erro ao adicionar alimento: ${error.message}` };

  revalidatePlano(planoId);
  return { success: true, message: "Alimento adicionado." };
}

export async function removerItemDoPlanoAction(itemId: string, planoId: string): Promise<ActionResult> {
  await assertAdmin();
  const supabase = await createClient();

  const { error } = await supabase.from("plano_refeicao_itens").delete().eq("id", itemId);
  if (error) return { success: false, message: `Erro ao remover item: ${error.message}` };

  revalidatePlano(planoId);
  return { success: true, message: "Item removido." };
}

export async function reordenarItensAction(planoId: string, itemIdsEmOrdem: string[]): Promise<ActionResult> {
  await assertAdmin();
  const supabase = await createClient();

  const results = await Promise.all(
    itemIdsEmOrdem.map((id, ordem) => supabase.from("plano_refeicao_itens").update({ ordem }).eq("id", id)),
  );
  const erro = results.find((r) => r.error);
  if (erro?.error) return { success: false, message: `Erro ao reordenar: ${erro.error.message}` };

  revalidatePlano(planoId);
  return { success: true, message: "Ordem atualizada." };
}

export async function finalizarPlanoAction(id: string): Promise<ActionResult> {
  await assertAdmin();
  const supabase = await createClient();

  const { error } = await supabase.from("planos_estruturados").update({ status: "finalizado" }).eq("id", id);
  if (error) return { success: false, message: `Erro ao finalizar: ${error.message}` };

  revalidatePlano(id);
  return { success: true, message: "Plano finalizado." };
}

export async function reabrirPlanoAction(id: string): Promise<ActionResult> {
  await assertAdmin();
  const supabase = await createClient();

  const { error } = await supabase.from("planos_estruturados").update({ status: "rascunho" }).eq("id", id);
  if (error) return { success: false, message: `Erro ao reabrir: ${error.message}` };

  revalidatePlano(id);
  return { success: true, message: "Plano reaberto para edição." };
}

export async function deletePlanoEstruturadoAction(id: string): Promise<ActionResult> {
  await assertAdmin();
  const supabase = await createClient();

  const { error } = await supabase.from("planos_estruturados").delete().eq("id", id);
  if (error) return { success: false, message: `Erro ao excluir plano: ${error.message}` };

  revalidatePath("/planos-alimentares");
  return { success: true, message: "Plano excluído." };
}
