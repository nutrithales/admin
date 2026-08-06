"use server";

import { revalidatePath } from "next/cache";
import { assertAdmin } from "@/lib/supabase/assert-admin";
import { createClient } from "@/lib/supabase/server";
import { protocoloSchema, type ProtocoloFormValues } from "@/utils/validation/protocolo";
import type { ActionResult } from "@/services/pacientes.actions";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

async function inserirDetalhes(supabase: SupabaseClient<Database>, protocoloId: string, data: ProtocoloFormValues) {
  for (const [i, refeicao] of data.refeicoes.entries()) {
    const { data: refeicaoRow, error: refeicaoError } = await supabase
      .from("protocolo_refeicoes")
      .insert({
        protocolo_id: protocoloId,
        nome: refeicao.nome,
        ordem: refeicao.ordem ?? i,
        horario_sugerido: refeicao.horario_sugerido || null,
        percentual_kcal: refeicao.percentual_kcal ?? null,
      })
      .select("id")
      .single();

    if (refeicaoError || !refeicaoRow) {
      throw new Error(`Erro ao salvar horário "${refeicao.nome}": ${refeicaoError?.message}`);
    }

    if (refeicao.refeicoes_modelo_ids.length > 0) {
      const { error: preferidasError } = await supabase.from("protocolo_refeicoes_preferidas").insert(
        refeicao.refeicoes_modelo_ids.map((refeicaoModeloId, j) => ({
          protocolo_refeicao_id: refeicaoRow.id,
          refeicao_modelo_id: refeicaoModeloId,
          ordem: j,
        })),
      );
      if (preferidasError) throw new Error(`Erro ao salvar refeições preferidas: ${preferidasError.message}`);
    }
  }

  if (data.receitas_preferidas_ids.length > 0) {
    const { error: receitasError } = await supabase.from("protocolo_receitas_preferidas").insert(
      data.receitas_preferidas_ids.map((receitaId, i) => ({
        protocolo_id: protocoloId,
        receita_id: receitaId,
        ordem: i,
      })),
    );
    if (receitasError) throw new Error(`Erro ao salvar receitas preferidas: ${receitasError.message}`);
  }

  if (data.regra_macro) {
    const { error: regraError } = await supabase.from("protocolo_regras_macro").insert({
      protocolo_id: protocoloId,
      proteina_g_por_kg_min: data.regra_macro.proteina_g_por_kg_min ?? null,
      proteina_g_por_kg_max: data.regra_macro.proteina_g_por_kg_max ?? null,
      gordura_percentual_kcal_min: data.regra_macro.gordura_percentual_kcal_min ?? null,
      gordura_percentual_kcal_max: data.regra_macro.gordura_percentual_kcal_max ?? null,
    });
    if (regraError) throw new Error(`Erro ao salvar faixas de macro: ${regraError.message}`);
  }
}

export async function createProtocoloAction(values: ProtocoloFormValues): Promise<ActionResult> {
  await assertAdmin();
  const parsed = protocoloSchema.safeParse(values);
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const data = parsed.data;
  const supabase = await createClient();

  const { data: protocolo, error: protocoloError } = await supabase
    .from("protocolos")
    .insert({ nome: data.nome, descricao: data.descricao || null, ativo: data.ativo })
    .select("id")
    .single();

  if (protocoloError || !protocolo) {
    return { success: false, message: `Erro ao criar protocolo: ${protocoloError?.message}` };
  }

  try {
    await inserirDetalhes(supabase, protocolo.id, data);
  } catch (err) {
    // `on delete cascade` nas tabelas filhas limpa tudo que já tiver sido
    // criado parcialmente.
    await supabase.from("protocolos").delete().eq("id", protocolo.id);
    return { success: false, message: err instanceof Error ? err.message : "Erro ao salvar detalhes do protocolo." };
  }

  revalidatePath("/protocolos");
  return { success: true, message: "Protocolo cadastrado." };
}

export async function updateProtocoloAction(id: string, values: ProtocoloFormValues): Promise<ActionResult> {
  await assertAdmin();
  const parsed = protocoloSchema.safeParse(values);
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const data = parsed.data;
  const supabase = await createClient();

  const { error: updateError } = await supabase
    .from("protocolos")
    .update({ nome: data.nome, descricao: data.descricao || null, ativo: data.ativo })
    .eq("id", id);

  if (updateError) return { success: false, message: `Erro ao atualizar protocolo: ${updateError.message}` };

  const [{ error: delRefeicoesError }, { error: delReceitasError }, { error: delRegraError }] = await Promise.all([
    supabase.from("protocolo_refeicoes").delete().eq("protocolo_id", id),
    supabase.from("protocolo_receitas_preferidas").delete().eq("protocolo_id", id),
    supabase.from("protocolo_regras_macro").delete().eq("protocolo_id", id),
  ]);

  if (delRefeicoesError || delReceitasError || delRegraError) {
    return { success: false, message: "Erro ao atualizar detalhes do protocolo." };
  }

  try {
    await inserirDetalhes(supabase, id, data);
  } catch (err) {
    return { success: false, message: err instanceof Error ? err.message : "Erro ao salvar detalhes do protocolo." };
  }

  revalidatePath("/protocolos");
  return { success: true, message: "Protocolo atualizado." };
}

export async function deleteProtocoloAction(id: string): Promise<ActionResult> {
  await assertAdmin();
  const supabase = await createClient();

  const { error } = await supabase.from("protocolos").delete().eq("id", id);
  if (error) return { success: false, message: `Erro ao excluir: ${error.message}` };

  revalidatePath("/protocolos");
  return { success: true, message: "Protocolo excluído." };
}
