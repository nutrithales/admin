"use server";

import { revalidatePath } from "next/cache";
import { assertAdmin } from "@/lib/supabase/assert-admin";
import { createClient } from "@/lib/supabase/server";
import { receitaSchema, type ReceitaFormValues } from "@/utils/validation/receita";
import { searchReceitas, type ReceitaOption } from "@/services/receitas.queries";
import type { ActionResult } from "@/services/pacientes.actions";

/** Wrapper de Server Action sobre `searchReceitas` — usado pelo Combobox
 * de receitas (ex. no editor de refeições-modelo). */
export async function searchReceitasAction(query: string): Promise<ReceitaOption[]> {
  await assertAdmin();
  return searchReceitas(query);
}

export async function createReceitaAction(values: ReceitaFormValues): Promise<ActionResult> {
  await assertAdmin();
  const parsed = receitaSchema.safeParse(values);
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const data = parsed.data;
  const supabase = await createClient();

  const { data: receita, error: receitaError } = await supabase
    .from("receitas")
    .insert({ nome: data.nome, modo_preparo: data.modo_preparo || null, tags: data.tags, ativo: data.ativo, revisado_manualmente: true })
    .select("id")
    .single();

  if (receitaError || !receita) {
    return { success: false, message: `Erro ao criar receita: ${receitaError?.message}` };
  }

  const { error: itensError } = await supabase.from("receita_itens").insert(
    data.itens.map((item, i) => ({
      receita_id: receita.id,
      alimento_id: item.alimento_id,
      quantidade_base_g: item.quantidade_base_g,
      papel_macro: item.papel_macro,
      componente: item.componente || null,
      ordem: item.ordem ?? i,
    })),
  );

  if (itensError) {
    // sem receita_itens a receita fica vazia e inútil — desfaz a criação
    await supabase.from("receitas").delete().eq("id", receita.id);
    return { success: false, message: `Erro ao salvar ingredientes: ${itensError.message}` };
  }

  revalidatePath("/receitas");
  return { success: true, message: "Receita cadastrada." };
}

export async function updateReceitaAction(id: string, values: ReceitaFormValues): Promise<ActionResult> {
  await assertAdmin();
  const parsed = receitaSchema.safeParse(values);
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const data = parsed.data;
  const supabase = await createClient();

  const { error: updateError } = await supabase
    .from("receitas")
    .update({ nome: data.nome, modo_preparo: data.modo_preparo || null, tags: data.tags, ativo: data.ativo, revisado_manualmente: true })
    .eq("id", id);

  if (updateError) return { success: false, message: `Erro ao atualizar receita: ${updateError.message}` };

  // Ingredientes são substituídos por completo — mais simples e seguro do
  // que tentar diffar linha a linha, e o formulário sempre envia a lista
  // completa (não um delta).
  const { error: deleteError } = await supabase.from("receita_itens").delete().eq("receita_id", id);
  if (deleteError) return { success: false, message: `Erro ao atualizar ingredientes: ${deleteError.message}` };

  const { error: insertError } = await supabase.from("receita_itens").insert(
    data.itens.map((item, i) => ({
      receita_id: id,
      alimento_id: item.alimento_id,
      quantidade_base_g: item.quantidade_base_g,
      papel_macro: item.papel_macro,
      componente: item.componente || null,
      ordem: item.ordem ?? i,
    })),
  );

  if (insertError) return { success: false, message: `Erro ao salvar ingredientes: ${insertError.message}` };

  revalidatePath("/receitas");
  return { success: true, message: "Receita atualizada." };
}

export async function deleteReceitaAction(id: string): Promise<ActionResult> {
  await assertAdmin();
  const supabase = await createClient();

  const { error } = await supabase.from("receitas").delete().eq("id", id);
  if (error) {
    return {
      success: false,
      message:
        error.code === "23503"
          ? "Esta receita está em uso em uma refeição-modelo ou protocolo."
          : `Erro ao excluir: ${error.message}`,
    };
  }

  revalidatePath("/receitas");
  return { success: true, message: "Receita excluída." };
}
