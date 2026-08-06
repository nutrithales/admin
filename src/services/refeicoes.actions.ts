"use server";

import { revalidatePath } from "next/cache";
import { assertAdmin } from "@/lib/supabase/assert-admin";
import { createClient } from "@/lib/supabase/server";
import { refeicaoModeloSchema, type RefeicaoModeloFormValues } from "@/utils/validation/refeicao-modelo";
import { searchRefeicoesModelo, type RefeicaoModeloOption } from "@/services/refeicoes.queries";
import type { ActionResult } from "@/services/pacientes.actions";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

/** Wrapper de Server Action sobre `searchRefeicoesModelo` — usado pelo
 * Combobox de refeições-modelo (ex. protocolos). */
export async function searchRefeicoesModeloAction(query: string): Promise<RefeicaoModeloOption[]> {
  await assertAdmin();
  return searchRefeicoesModelo(query);
}

/** Cria as opções + itens de uma refeição-modelo já existente (assume que
 * nenhuma opção/item prévio existe para esse id — quem chama garante isso
 * criando a refeição do zero ou limpando antes, no caso de update). */
async function inserirOpcoes(
  supabase: SupabaseClient<Database>,
  refeicaoModeloId: string,
  opcoes: RefeicaoModeloFormValues["opcoes"],
) {
  for (const [i, opcao] of opcoes.entries()) {
    const { data: opcaoRow, error: opcaoError } = await supabase
      .from("refeicao_modelo_opcoes")
      .insert({ refeicao_modelo_id: refeicaoModeloId, nome: opcao.nome, ordem: opcao.ordem ?? i })
      .select("id")
      .single();

    if (opcaoError || !opcaoRow) throw new Error(`Erro ao salvar opção "${opcao.nome}": ${opcaoError?.message}`);

    const { error: itensError } = await supabase.from("refeicao_modelo_opcao_itens").insert(
      opcao.itens.map((item, j) => ({
        opcao_id: opcaoRow.id,
        receita_id: item.receita_id ?? null,
        alimento_id: item.alimento_id ?? null,
        quantidade_g: item.quantidade_g ?? null,
        ordem: item.ordem ?? j,
      })),
    );

    if (itensError) throw new Error(`Erro ao salvar itens da opção "${opcao.nome}": ${itensError.message}`);
  }
}

export async function createRefeicaoModeloAction(values: RefeicaoModeloFormValues): Promise<ActionResult> {
  await assertAdmin();
  const parsed = refeicaoModeloSchema.safeParse(values);
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const data = parsed.data;
  const supabase = await createClient();

  const { data: refeicao, error: refeicaoError } = await supabase
    .from("refeicoes_modelo")
    .insert({ nome: data.nome, tags: data.tags, ativo: data.ativo })
    .select("id")
    .single();

  if (refeicaoError || !refeicao) {
    return { success: false, message: `Erro ao criar refeição: ${refeicaoError?.message}` };
  }

  try {
    await inserirOpcoes(supabase, refeicao.id, data.opcoes);
  } catch (err) {
    // `refeicao_modelo_opcoes`/`opcao_itens` são `on delete cascade`, então
    // apagar a refeição já limpa qualquer opção/item parcialmente criado.
    await supabase.from("refeicoes_modelo").delete().eq("id", refeicao.id);
    return { success: false, message: err instanceof Error ? err.message : "Erro ao salvar opções." };
  }

  revalidatePath("/refeicoes");
  return { success: true, message: "Refeição-modelo cadastrada." };
}

export async function updateRefeicaoModeloAction(id: string, values: RefeicaoModeloFormValues): Promise<ActionResult> {
  await assertAdmin();
  const parsed = refeicaoModeloSchema.safeParse(values);
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const data = parsed.data;
  const supabase = await createClient();

  const { error: updateError } = await supabase
    .from("refeicoes_modelo")
    .update({ nome: data.nome, tags: data.tags, ativo: data.ativo })
    .eq("id", id);

  if (updateError) return { success: false, message: `Erro ao atualizar refeição: ${updateError.message}` };

  // Mesma estratégia de "substituir tudo" usada em receitas: mais simples
  // e segura do que diffar opção a opção. `on delete cascade` limpa os
  // itens junto das opções.
  const { error: deleteError } = await supabase.from("refeicao_modelo_opcoes").delete().eq("refeicao_modelo_id", id);
  if (deleteError) return { success: false, message: `Erro ao atualizar opções: ${deleteError.message}` };

  try {
    await inserirOpcoes(supabase, id, data.opcoes);
  } catch (err) {
    return { success: false, message: err instanceof Error ? err.message : "Erro ao salvar opções." };
  }

  revalidatePath("/refeicoes");
  return { success: true, message: "Refeição-modelo atualizada." };
}

export async function deleteRefeicaoModeloAction(id: string): Promise<ActionResult> {
  await assertAdmin();
  const supabase = await createClient();

  const { error } = await supabase.from("refeicoes_modelo").delete().eq("id", id);
  if (error) {
    return {
      success: false,
      message: error.code === "23503" ? "Esta refeição está em uso em um protocolo." : `Erro ao excluir: ${error.message}`,
    };
  }

  revalidatePath("/refeicoes");
  return { success: true, message: "Refeição-modelo excluída." };
}
