"use server";

import { revalidatePath } from "next/cache";
import { assertAdmin } from "@/lib/supabase/assert-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ActionResult } from "@/services/pacientes.actions";

function parseSaoPauloDateTime(value: string) {
  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(trimmed)) return null;
  const normalized = trimmed.length === 16 ? `${trimmed}:00` : trimmed;
  const date = new Date(`${normalized}-03:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function criarCheckinAutomacaoAction(formData: FormData): Promise<ActionResult> {
  await assertAdmin();

  const formularioId = String(formData.get("formulario_id") || "");
  const nome = String(formData.get("nome") || "").trim();
  const publico = String(formData.get("publico") || "ativos");
  const recorrenciaDias = Number(formData.get("recorrencia_dias") || 15);
  const primeiraExecucao = parseSaoPauloDateTime(String(formData.get("primeira_execucao_em") || ""));
  const pacienteIds = formData.getAll("paciente_ids").map(String).filter(Boolean);

  if (!formularioId || !nome) return { success: false, message: "Informe o nome da automação e o formulário." };
  if (!["todos", "ativos", "selecionados"].includes(publico)) return { success: false, message: "Público inválido." };
  if (!Number.isInteger(recorrenciaDias) || recorrenciaDias < 1 || recorrenciaDias > 365) {
    return { success: false, message: "A recorrência deve ficar entre 1 e 365 dias." };
  }
  if (!primeiraExecucao) return { success: false, message: "Informe uma data e horário válidos para o primeiro disparo." };
  if (publico === "selecionados" && pacienteIds.length === 0) {
    return { success: false, message: "Selecione ao menos um paciente." };
  }

  const supabase = createAdminClient() as any;
  const { data: formulario } = await supabase.from("formularios").select("id,tipo").eq("id", formularioId).eq("ativo", true).maybeSingle();
  if (!formulario) return { success: false, message: "Formulário ativo não encontrado." };

  const { error } = await supabase.from("formulario_automacoes").insert({
    formulario_id: formularioId,
    nome,
    publico,
    paciente_ids: publico === "selecionados" ? pacienteIds : [],
    recorrencia_dias: recorrenciaDias,
    primeira_execucao_em: primeiraExecucao.toISOString(),
    proximo_disparo_em: primeiraExecucao.toISOString(),
    ativo: true,
  });

  if (error) return { success: false, message: `Erro ao criar automação: ${error.message}` };
  revalidatePath("/checkins");
  return { success: true, message: "Automação de check-in criada." };
}

export async function alternarCheckinAutomacaoAction(id: string, ativo: boolean): Promise<ActionResult> {
  await assertAdmin();
  const supabase = createAdminClient() as any;
  const { error } = await supabase.from("formulario_automacoes").update({ ativo, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) return { success: false, message: `Erro ao atualizar automação: ${error.message}` };
  revalidatePath("/checkins");
  return { success: true, message: ativo ? "Automação ativada." : "Automação pausada." };
}

export async function excluirCheckinAutomacaoAction(id: string): Promise<ActionResult> {
  await assertAdmin();
  const supabase = createAdminClient() as any;
  const { error } = await supabase.from("formulario_automacoes").delete().eq("id", id);
  if (error) return { success: false, message: `Erro ao excluir automação: ${error.message}` };
  revalidatePath("/checkins");
  return { success: true, message: "Automação excluída." };
}
