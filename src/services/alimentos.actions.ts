"use server";

import { revalidatePath } from "next/cache";
import { assertAdmin } from "@/lib/supabase/assert-admin";
import { createClient } from "@/lib/supabase/server";
import { alimentoSchema, type AlimentoFormValues } from "@/utils/validation/alimento";
import { searchAlimentos, type AlimentoOption } from "@/services/alimentos.queries";
import type { ActionResult } from "@/services/pacientes.actions";

/** Wrapper de Server Action sobre `searchAlimentos` — o Combobox roda no
 * cliente e não pode importar `alimentos.queries.ts` diretamente (é
 * `server-only`). */
export async function searchAlimentosAction(query: string): Promise<AlimentoOption[]> {
  await assertAdmin();
  return searchAlimentos(query);
}

export async function createAlimentoAction(values: AlimentoFormValues): Promise<ActionResult> {
  await assertAdmin();
  const parsed = alimentoSchema.safeParse(values);
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const data = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.from("alimentos").insert({
    nome: data.nome,
    origem: data.origem,
    origem_referencia: data.origem_referencia || null,
    kcal_100g: data.kcal_100g,
    proteina_100g: data.proteina_100g,
    carboidrato_100g: data.carboidrato_100g,
    gordura_100g: data.gordura_100g,
    porcao_padrao_g: data.porcao_padrao_g ?? null,
    categoria: data.categoria || null,
    grupo_alimentar: data.grupo_alimentar || null,
    tags_restricao: data.tags_restricao,
    ativo: data.ativo,
  });

  if (error) return { success: false, message: `Erro ao criar alimento: ${error.message}` };

  revalidatePath("/alimentos");
  return { success: true, message: "Alimento cadastrado." };
}

export async function updateAlimentoAction(id: string, values: AlimentoFormValues): Promise<ActionResult> {
  await assertAdmin();
  const parsed = alimentoSchema.safeParse(values);
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const data = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase
    .from("alimentos")
    .update({
      nome: data.nome,
      origem: data.origem,
      origem_referencia: data.origem_referencia || null,
      kcal_100g: data.kcal_100g,
      proteina_100g: data.proteina_100g,
      carboidrato_100g: data.carboidrato_100g,
      gordura_100g: data.gordura_100g,
      porcao_padrao_g: data.porcao_padrao_g ?? null,
      categoria: data.categoria || null,
      grupo_alimentar: data.grupo_alimentar || null,
      tags_restricao: data.tags_restricao,
      ativo: data.ativo,
    })
    .eq("id", id);

  if (error) return { success: false, message: `Erro ao atualizar alimento: ${error.message}` };

  revalidatePath("/alimentos");
  return { success: true, message: "Alimento atualizado." };
}

export async function deleteAlimentoAction(id: string): Promise<ActionResult> {
  await assertAdmin();
  const supabase = await createClient();

  const { error } = await supabase.from("alimentos").delete().eq("id", id);
  if (error) {
    // FK com receita_itens/refeicao_modelo_opcao_itens usa `on delete restrict`
    // de propósito — não deixar apagar um alimento em uso silenciosamente.
    return {
      success: false,
      message: error.code === "23503" ? "Este alimento está em uso em receitas ou refeições." : `Erro ao excluir: ${error.message}`,
    };
  }

  revalidatePath("/alimentos");
  return { success: true, message: "Alimento excluído." };
}
