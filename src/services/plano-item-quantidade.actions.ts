"use server";

import { revalidatePath } from "next/cache";
import { assertAdmin } from "@/lib/supabase/assert-admin";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/services/pacientes.actions";

function revalidar(planoId: string) {
  revalidatePath(`/planos-alimentares/${planoId}`);
  revalidatePath(`/planos-alimentares/${planoId}/preview`);
  revalidatePath("/paciente/plano-alimentar");
}

export async function atualizarQuantidadeItemAction(
  itemId: string,
  planoId: string,
  quantidadeG: number,
): Promise<ActionResult> {
  await assertAdmin();
  if (!Number.isFinite(quantidadeG) || quantidadeG <= 0 || quantidadeG > 5000) {
    return { success: false, message: "Informe uma quantidade válida em gramas." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("plano_refeicao_itens")
    .update({ quantidade_g: Math.round(quantidadeG * 10) / 10 })
    .eq("id", itemId);

  if (error) return { success: false, message: `Erro ao atualizar quantidade: ${error.message}` };
  revalidar(planoId);
  return { success: true, message: "Quantidade atualizada." };
}

export async function atualizarQuantidadeIngredienteAction(
  ingredienteId: string,
  planoId: string,
  quantidadeG: number,
): Promise<ActionResult> {
  await assertAdmin();
  if (!Number.isFinite(quantidadeG) || quantidadeG <= 0 || quantidadeG > 5000) {
    return { success: false, message: "Informe uma quantidade válida em gramas." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("plano_refeicao_item_ingredientes")
    .update({ quantidade_g_final: Math.round(quantidadeG * 10) / 10, receita_item_id: null })
    .eq("id", ingredienteId);

  if (error) return { success: false, message: `Erro ao atualizar quantidade: ${error.message}` };
  revalidar(planoId);
  return { success: true, message: "Quantidade atualizada." };
}
