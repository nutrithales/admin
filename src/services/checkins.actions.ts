"use server";

import { revalidatePath } from "next/cache";
import { GoogleGenAI } from "@google/genai";
import { assertAdmin } from "@/lib/supabase/assert-admin";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { syncPendencias } from "@/services/pendencias.actions";
import type { ActionResult } from "@/services/pacientes.actions";

export async function enviarCheckinAction(authId: string): Promise<ActionResult> {
  await assertAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("checkins").insert({
    auth_id: authId,
    status: "enviado",
    enviado_em: new Date().toISOString(),
    semana: new Date().toISOString().slice(0, 10),
    origem: "manual",
  });
  if (error) return { success: false, message: `Erro ao registrar envio: ${error.message}` };
  await syncPendencias();
  revalidatePath("/checkins");
  revalidatePath("/clara");
  return { success: true, message: "Check-in marcado como enviado." };
}

export async function registrarRespostaCheckinAction(authId: string, resumo: string, pontuacao?: number): Promise<ActionResult> {
  await assertAdmin();
  const supabase = await createClient();
  const { data: paciente } = await supabase.from("pacientes").select("id").eq("auth_id", authId).maybeSingle();
  const { data: pendente } = await supabase.from("checkins").select("id").eq("auth_id", authId).eq("status", "enviado").order("enviado_em", { ascending: false }).limit(1).maybeSingle();
  const respondidoEm = new Date().toISOString();
  const { error } = pendente
    ? await supabase.from("checkins").update({ status: "respondido", respondido_em: respondidoEm, resumo, pontuacao: pontuacao ?? null, paciente_id: paciente?.id ?? null }).eq("id", pendente.id)
    : await supabase.from("checkins").insert({ auth_id: authId, paciente_id: paciente?.id ?? null, status: "respondido", respondido_em: respondidoEm, semana: respondidoEm.slice(0, 10), resumo, pontuacao: pontuacao ?? null, origem: "manual" });
  if (error) return { success: false, message: `Erro ao registrar resposta: ${error.message}` };
  await syncPendencias();
  revalidatePath("/checkins");
  revalidatePath("/clara");
  return { success: true, message: "Resposta do check-in registrada." };
}

export async function marcarCheckinRevisadoAction(id: number): Promise<ActionResult> {
  await assertAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("checkins").update({ revisado: true }).eq("id", id);
  if (error) return { success: false, message: `Erro ao marcar como revisado: ${error.message}` };
  revalidatePath("/checkins");
  revalidatePath(`/checkins/${id}`);
  return { success: true, message: "Check-in marcado como revisado." };
}

export async function salvarRespostaClinicaAction(id: number, mensagem: string, analise?: string, orientacoes?: string): Promise<ActionResult> {
  await assertAdmin();
  const supabase = createAdminClient() as any;
  const { error } = await supabase.from("checkins").update({
    mensagem_paciente: mensagem.trim() || null,
    analise_ia: analise?.trim() || null,
    orientacoes_ia: orientacoes?.trim() || null,
    analisado_em: new Date().toISOString(),
  }).eq("id", id);
  if (error) return { success: false, message: `Erro ao salvar análise: ${error.message}` };
  revalidatePath(`/checkins/${id}`);
  revalidatePath("/checkins");
  return { success: true, message: "Análise e mensagem salvas." };
}

export async function marcarEnviadoWhatsAppAction(id: number): Promise<ActionResult> {
  await assertAdmin();
  const supabase = createAdminClient() as any;
  const { error } = await supabase.from("checkins").update({ enviado_whatsapp_em: new Date().toISOString(), revisado: true }).eq("id", id);
  if (error) return { success: false, message: `Erro ao registrar envio: ${error.message}` };
  revalidatePath(`/checkins/${id}`);
  revalidatePath("/checkins");
  return { success: true, message: "Envio pelo WhatsApp registrado." };
}

export async function gerarPanoramaIaAction(id: number): Promise<ActionResult> {
  await assertAdmin();
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return { success: false, message: "GEMINI_API_KEY não está configurada. Você ainda pode usar o botão de copiar e abrir o ChatGPT." };

  const supabase = createAdminClient() as any;
  const { data: atual } = await supabase.from("checkins").select("*, paciente:pacientes(nome,objetivo,plano)").eq("id", id).maybeSingle();
  if (!atual) return { success: false, message: "Check-in não encontrado." };
  const pacienteId = atual.paciente_id;
  const { data: historico } = pacienteId
    ? await supabase.from("checkins").select("semana,pontuacao,resumo,respostas,analise_ia,orientacoes_ia").eq("paciente_id", pacienteId).order("semana", { ascending: false }).limit(8)
    : { data: [atual] };

  const prompt = `Você é um assistente de apoio a um nutricionista. Analise somente os dados fornecidos, sem diagnosticar doenças, sem prescrever medicamentos e sem substituir julgamento clínico.\n\nPaciente: ${atual.paciente?.nome ?? "Paciente"}\nObjetivo: ${atual.paciente?.objetivo ?? "não informado"}\nPlano: ${atual.paciente?.plano ?? "não informado"}\n\nHistórico de check-ins (mais recente primeiro):\n${JSON.stringify(historico ?? [], null, 2)}\n\nEntregue em português do Brasil, de forma objetiva:\n1) PANORAMA GERAL: tendência de aderência e evolução ao longo dos check-ins.\n2) PONTOS POSITIVOS: o que melhorou ou está consistente.\n3) PONTOS DE ATENÇÃO: padrões recorrentes ou pioras.\n4) PRÓXIMOS 15 DIAS: 3 a 5 orientações comportamentais e nutricionais gerais, práticas e não medicamentosas.\n5) MENSAGEM PARA O PACIENTE: texto de WhatsApp, acolhedor, direto e profissional, sem terrorismo nutricional e sem linguagem punitiva.\n\nNão invente dados ausentes.`;

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({ model: "gemini-2.5-flash", contents: prompt });
    const texto = response.text?.trim();
    if (!texto) return { success: false, message: "A IA não retornou conteúdo." };

    const mensagemMatch = texto.match(/5\)\s*MENSAGEM PARA O PACIENTE:?([\s\S]*)$/i);
    const mensagem = mensagemMatch?.[1]?.trim() || null;
    const orientacoesMatch = texto.match(/4\)\s*PRÓXIMOS 15 DIAS:?([\s\S]*?)(?:5\)\s*MENSAGEM PARA O PACIENTE|$)/i);
    const orientacoes = orientacoesMatch?.[1]?.trim() || null;

    const { error } = await supabase.from("checkins").update({
      analise_ia: texto,
      orientacoes_ia: orientacoes,
      mensagem_paciente: mensagem,
      analisado_em: new Date().toISOString(),
    }).eq("id", id);
    if (error) return { success: false, message: `A IA respondeu, mas não foi possível salvar: ${error.message}` };
    revalidatePath(`/checkins/${id}`);
    revalidatePath("/checkins");
    return { success: true, message: "Panorama atualizado pela IA." };
  } catch (error) {
    return { success: false, message: `Não foi possível gerar a análise: ${error instanceof Error ? error.message : "erro desconhecido"}` };
  }
}
