"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { assertAdmin } from "@/lib/supabase/assert-admin";
import { assertAdminComNivel } from "@/lib/supabase/assert-permission";
import { detectarPendencias } from "@/lib/clara/pendencias-engine";
import { planEndDate } from "@/lib/agenda/plans";
import { FLOW_AUTOMATIC_RULES, automaticNextActionForStage, addCalendarDays } from "@/lib/fluxo/automation";
import type { FlowStageKey } from "@/lib/fluxo/stages";
import type { Tables } from "@/types/database.types";
import type { ActionResult } from "@/services/pacientes.actions";

function chaveCandidata(c: { tipo: string; pacienteId: string | null; tarefaId?: string | null }) {
  return `${c.tipo}::${c.pacienteId ?? ""}::${c.tarefaId ?? ""}`;
}

const MS_DIA = 24 * 60 * 60 * 1000;
const ETAPAS_RENOVACAO_EM_ANDAMENTO = new Set<string>([
  "12_renovacao_30_dias",
  "13_proposta_renovacao",
  "14_plano_encerrado",
  "15_reativacao_pendente",
]);

function diasAte(data: Date, agora: Date) {
  return Math.ceil((data.getTime() - agora.getTime()) / MS_DIA);
}

async function aplicarAutomacoesFluxo(
  supabase: Awaited<ReturnType<typeof createClient>>,
  pacientes: Tables<"pacientes">[],
) {
  const agora = new Date();

  for (const paciente of pacientes) {
    if (paciente.status !== "ativo") continue;

    let proximaEtapa: FlowStageKey | null = null;
    let observacao: string | null = null;

    // A renovação é determinada pelo término contratual (data de início +
    // duração do plano), nunca pela quantidade de consultas usadas/restantes.
    const terminoPlano = planEndDate(paciente.data_inicio, paciente.plano);
    if (terminoPlano) {
      const faltamDias = diasAte(terminoPlano, agora);

      if (
        faltamDias <= 0 &&
        paciente.fluxo_etapa !== "14_plano_encerrado" &&
        paciente.fluxo_etapa !== "15_reativacao_pendente"
      ) {
        proximaEtapa = "14_plano_encerrado";
        observacao = "Plano chegou ao término contratual sem renovação registrada.";
      } else if (
        faltamDias > 0 &&
        faltamDias <= 30 &&
        !ETAPAS_RENOVACAO_EM_ANDAMENTO.has(paciente.fluxo_etapa)
      ) {
        proximaEtapa = "12_renovacao_30_dias";
        observacao = `Entrada automática na renovação: faltam ${faltamDias} dia(s) para o término contratual.`;
      }
    }

    // Se nenhuma regra de renovação tomou precedência, verifica as passagens
    // temporais normais do acompanhamento (06→06.1, 08→09, 09→10, 10→11,
    // 14→15). Para dados antigos sem próxima ação, usa fluxo_updated_at.
    if (!proximaEtapa) {
      const etapaAtual = paciente.fluxo_etapa as FlowStageKey;
      const regra = FLOW_AUTOMATIC_RULES[etapaAtual];
      if (regra?.nextStage) {
        const vencimento = paciente.fluxo_proxima_acao_em
          ? new Date(paciente.fluxo_proxima_acao_em)
          : addCalendarDays(new Date(paciente.fluxo_updated_at), regra.afterDays);
        if (!Number.isNaN(vencimento.getTime()) && vencimento <= agora) {
          proximaEtapa = regra.nextStage;
          observacao = `Passagem automática após ${regra.afterDays} dia(s) na etapa anterior.`;
        }
      }
    }

    if (!proximaEtapa || proximaEtapa === paciente.fluxo_etapa) continue;

    const etapaAnterior = paciente.fluxo_etapa;
    const proximaAcaoEm = automaticNextActionForStage(proximaEtapa, agora);
    const agoraIso = agora.toISOString();
    const { error } = await supabase
      .from("pacientes")
      .update({
        fluxo_etapa: proximaEtapa,
        fluxo_proxima_acao_em: proximaAcaoEm,
        fluxo_updated_at: agoraIso,
      })
      .eq("id", paciente.id);

    if (error) continue;

    await supabase.from("fluxo_movimentacoes").insert({
      paciente_id: paciente.id,
      de_etapa: etapaAnterior,
      para_etapa: proximaEtapa,
      admin_id: null,
      observacao,
    });

    // Mantém o conjunto já carregado coerente para o motor de pendências
    // desta mesma execução, sem precisar de uma segunda consulta geral.
    paciente.fluxo_etapa = proximaEtapa;
    paciente.fluxo_proxima_acao_em = proximaAcaoEm;
    paciente.fluxo_updated_at = agoraIso;
  }
}

export async function syncPendencias(): Promise<void> {
  await assertAdmin();
  const supabase = await createClient();

  const [
    { data: pacientes },
    { data: consultas },
    { data: checkins },
    { data: pagamentos },
    { data: tarefas },
    { data: movimentacoes },
    { data: pendenciasAtivas },
  ] = await Promise.all([
    supabase.from("pacientes").select("*"),
    supabase.from("consultas").select("*"),
    supabase.from("checkins").select("*"),
    supabase.from("pagamentos").select("*"),
    supabase.from("tarefas").select("*"),
    supabase
      .from("fluxo_movimentacoes")
      .select("paciente_id, created_at")
      .order("created_at", { ascending: false }),
    supabase.from("pendencias").select("*").neq("status", "resolvida"),
  ]);

  const pacientesAtuais = pacientes ?? [];
  await aplicarAutomacoesFluxo(supabase, pacientesAtuais);

  const ultimaMovimentacaoPorPaciente = new Map<string, string>();
  for (const mov of movimentacoes ?? []) {
    if (!ultimaMovimentacaoPorPaciente.has(mov.paciente_id)) {
      ultimaMovimentacaoPorPaciente.set(mov.paciente_id, mov.created_at);
    }
  }

  const candidatas = detectarPendencias({
    pacientes: pacientesAtuais,
    consultas: consultas ?? [],
    checkins: checkins ?? [],
    pagamentos: pagamentos ?? [],
    tarefas: tarefas ?? [],
    ultimaMovimentacaoPorPaciente,
  });

  const candidatasPorChave = new Map(candidatas.map((c) => [chaveCandidata(c), c]));
  const hojeIso = new Date().toISOString().slice(0, 10);

  const idsParaResolver: string[] = [];
  const idsParaReabrir: string[] = [];
  const chavesExistentes = new Set<string>();

  for (const ativa of pendenciasAtivas ?? []) {
    const k = chaveCandidata({ tipo: ativa.tipo, pacienteId: ativa.paciente_id, tarefaId: ativa.tarefa_id });
    chavesExistentes.add(k);
    if (!candidatasPorChave.has(k)) {
      idsParaResolver.push(ativa.id);
    } else if (ativa.status === "adiada" && ativa.adiada_ate && ativa.adiada_ate < hojeIso) {
      idsParaReabrir.push(ativa.id);
    }
  }

  const paraInserir = candidatas.filter((c) => !chavesExistentes.has(chaveCandidata(c)));

  await Promise.all([
    idsParaResolver.length
      ? supabase
          .from("pendencias")
          .update({ status: "resolvida", resolvida_em: new Date().toISOString() })
          .in("id", idsParaResolver)
      : null,
    idsParaReabrir.length
      ? supabase.from("pendencias").update({ status: "pendente" }).in("id", idsParaReabrir)
      : null,
    paraInserir.length
      ? supabase.from("pendencias").insert(
          paraInserir.map((c) => ({
            tipo: c.tipo,
            paciente_id: c.pacienteId,
            tarefa_id: c.tarefaId ?? null,
            consulta_id: c.consultaId ?? null,
            motivo: c.motivo,
            prioridade: c.prioridade,
            prazo: c.prazo ?? null,
          })),
        )
      : null,
  ]);
}

export async function resolverPendenciaAction(id: string): Promise<ActionResult> {
  const { adminId } = await assertAdminComNivel();
  const supabase = await createClient();
  const { error } = await supabase
    .from("pendencias")
    .update({ status: "resolvida", resolvida_em: new Date().toISOString(), resolvida_por: adminId })
    .eq("id", id);
  if (error) return { success: false, message: `Erro ao resolver pendência: ${error.message}` };

  revalidatePath("/clara");
  return { success: true, message: "Pendência resolvida." };
}

export async function adiarPendenciaAction(id: string, ateIso: string): Promise<ActionResult> {
  await assertAdmin();
  const supabase = await createClient();
  const { error } = await supabase
    .from("pendencias")
    .update({ status: "adiada", adiada_ate: ateIso })
    .eq("id", id);
  if (error) return { success: false, message: `Erro ao adiar pendência: ${error.message}` };

  revalidatePath("/clara");
  return { success: true, message: "Pendência adiada." };
}
