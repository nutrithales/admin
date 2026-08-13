"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { assertAdmin } from "@/lib/supabase/assert-admin";
import { assertAdminComNivel } from "@/lib/supabase/assert-permission";
import { planEndDate } from "@/lib/agenda/plans";
import type { Tables } from "@/types/database.types";
import type { ActionResult } from "@/services/pacientes.actions";

interface Candidata {
  tipo: string;
  pacienteId: string | null;
  tarefaId?: string | null;
  consultaId?: string | null;
  motivo: string;
  prioridade: "baixa" | "media" | "alta";
  prazo?: string | null;
  chaveEvento: string;
}

type PacienteOperacional = Tables<"pacientes"> & {
  plano_entregue_em?: string | null;
  proxima_reconsulta_prevista?: string | null;
  reconsulta_intervalo_dias?: number | null;
};

const DIA = 86_400_000;
const NOVAS_ETAPAS_RENOVACAO = new Set(["09_renovacao_30_dias", "10_proposta_enviada", "11_plano_encerrado", "12_reativacao"]);

function diasDesde(iso: string | null | undefined, hoje: Date): number | null {
  if (!iso) return null;
  const data = new Date(iso);
  if (Number.isNaN(data.getTime())) return null;
  return Math.floor((hoje.getTime() - data.getTime()) / DIA);
}

function diasAte(iso: string | null | undefined, hoje: Date): number | null {
  if (!iso) return null;
  const data = new Date(iso);
  if (Number.isNaN(data.getTime())) return null;
  return Math.ceil((data.getTime() - hoje.getTime()) / DIA);
}

function chave(nome: string, ref?: string | null) {
  return `${nome}:${ref ?? "sem-ref"}`;
}

async function moverAutomaticamente(
  db: any,
  paciente: PacienteOperacional,
  etapa: string,
  observacao: string,
  agora: Date,
) {
  if (paciente.fluxo_etapa === etapa) return;
  const anterior = paciente.fluxo_etapa;
  const agoraIso = agora.toISOString();
  const { error } = await db.from("pacientes").update({
    fluxo_etapa: etapa,
    fluxo_proxima_acao_em: null,
    fluxo_updated_at: agoraIso,
  }).eq("id", paciente.id);
  if (error) return;
  await db.from("fluxo_movimentacoes").insert({
    paciente_id: paciente.id,
    de_etapa: anterior,
    para_etapa: etapa,
    admin_id: null,
    observacao,
  });
  paciente.fluxo_etapa = etapa;
  paciente.fluxo_updated_at = agoraIso;
  paciente.fluxo_proxima_acao_em = null;
}

async function aplicarRenovacaoAutomatica(db: any, pacientes: PacienteOperacional[], agora: Date) {
  for (const paciente of pacientes) {
    if (paciente.status !== "ativo" || paciente.fluxo_etapa === "pausa_acompanhamento") continue;
    const fim = planEndDate(paciente.data_inicio, paciente.plano);
    if (!fim) continue;
    const faltam = Math.ceil((fim.getTime() - agora.getTime()) / DIA);

    if (faltam <= 0 && paciente.fluxo_etapa !== "11_plano_encerrado" && paciente.fluxo_etapa !== "12_reativacao") {
      await moverAutomaticamente(db, paciente, "11_plano_encerrado", "Plano chegou ao término contratual sem renovação registrada.", agora);
      continue;
    }
    if (faltam > 0 && faltam <= 30 && !NOVAS_ETAPAS_RENOVACAO.has(paciente.fluxo_etapa)) {
      await moverAutomaticamente(db, paciente, "09_renovacao_30_dias", `Entrada automática na renovação: faltam ${faltam} dia(s) para o término contratual.`, agora);
    }
  }
}

function detectarPendencias(
  pacientes: PacienteOperacional[],
  consultas: Tables<"consultas">[],
  checkins: Tables<"checkins">[],
  pagamentos: Tables<"pagamentos">[],
  tarefas: Tables<"tarefas">[],
  hoje: Date,
): Candidata[] {
  const candidatas: Candidata[] = [];
  const consultasPorAuth = new Map<string, Tables<"consultas">[]>();
  const checkinsPorAuth = new Map<string, Tables<"checkins">[]>();

  for (const c of consultas) consultasPorAuth.set(c.auth_id, [...(consultasPorAuth.get(c.auth_id) ?? []), c]);
  for (const c of checkins) checkinsPorAuth.set(c.auth_id, [...(checkinsPorAuth.get(c.auth_id) ?? []), c]);

  for (const paciente of pacientes) {
    const consultasPaciente = consultasPorAuth.get(paciente.auth_id) ?? [];
    const futuras = consultasPaciente
      .filter((c) => (c.status === "agendada" || c.status === "confirmada") && c.data && new Date(c.data) >= hoje)
      .sort((a, b) => +new Date(a.data ?? 0) - +new Date(b.data ?? 0));
    const proxima = futuras[0];

    for (const consulta of consultasPaciente) {
      if (consulta.status !== "agendada" || !consulta.data) continue;
      const horas = (new Date(consulta.data).getTime() - hoje.getTime()) / 3_600_000;
      if (horas >= 0 && horas <= 48) {
        candidatas.push({
          tipo: "consulta_nao_confirmada",
          pacienteId: paciente.id,
          consultaId: consulta.id,
          motivo: `Consulta em ${new Date(consulta.data).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })} ainda não confirmada.`,
          prioridade: horas <= 24 ? "alta" : "media",
          prazo: consulta.data,
          chaveEvento: chave("consulta-nao-confirmada", consulta.id),
        });
      }
    }

    const acompanhando = paciente.status === "ativo" && paciente.fluxo_etapa !== "pausa_acompanhamento";
    if (acompanhando) {
      if (paciente.fluxo_etapa === "06_plano_elaboracao") {
        candidatas.push({
          tipo: "aguardando_plano_alimentar",
          pacienteId: paciente.id,
          motivo: "Consulta concluída — finalizar e entregar o plano alimentar.",
          prioridade: "alta",
          chaveEvento: chave("plano-elaboracao", paciente.fluxo_updated_at),
        });
      }

      const diasPlano = diasDesde(paciente.plano_entregue_em, hoje);
      if (diasPlano !== null && diasPlano >= 3) {
        candidatas.push({
          tipo: "checkin_3_dias_pendente",
          pacienteId: paciente.id,
          motivo: "Plano entregue há pelo menos 3 dias. Fazer contato de adaptação, dúvidas e dificuldades iniciais.",
          prioridade: diasPlano >= 7 ? "alta" : "media",
          prazo: paciente.plano_entregue_em,
          chaveEvento: chave("pos-plano-d3", paciente.plano_entregue_em),
        });
      }
      if (diasPlano !== null && diasPlano >= 7) {
        candidatas.push({
          tipo: "checkin_7_dias_pendente",
          pacienteId: paciente.id,
          motivo: "Plano entregue há pelo menos 7 dias. Fazer o segundo contato pós-entrega.",
          prioridade: "media",
          prazo: paciente.plano_entregue_em,
          chaveEvento: chave("pos-plano-d7", paciente.plano_entregue_em),
        });
      }

      const checkinsPaciente = (checkinsPorAuth.get(paciente.auth_id) ?? []).sort(
        (a, b) => +new Date(b.respondido_em ?? b.enviado_em ?? b.created_at ?? 0) - +new Date(a.respondido_em ?? a.enviado_em ?? a.created_at ?? 0),
      );
      const ultimo = checkinsPaciente[0];
      if (ultimo?.status === "enviado") {
        const semResposta = diasDesde(ultimo.enviado_em, hoje) ?? 0;
        if (semResposta >= 2) {
          candidatas.push({
            tipo: "checkin_nao_respondido",
            pacienteId: paciente.id,
            motivo: semResposta > 5
              ? "Check-in continua sem resposta há mais de 5 dias. Fazer novo contato."
              : "Check-in enviado há 2 dias e ainda sem resposta. Enviar lembrete.",
            prioridade: semResposta > 5 ? "alta" : "media",
            chaveEvento: chave(semResposta > 5 ? "checkin-sem-resposta-d5" : "checkin-sem-resposta-d2", ultimo.id),
          });
        }
      } else {
        const referencia = ultimo?.respondido_em ?? ultimo?.created_at ?? paciente.plano_entregue_em;
        const desdeReferencia = diasDesde(referencia, hoje);
        if (desdeReferencia !== null && desdeReferencia >= 15) {
          candidatas.push({
            tipo: "checkin_pendente_envio",
            pacienteId: paciente.id,
            motivo: "Chegou a data do check-in de acompanhamento (15 dias).",
            prioridade: "media",
            chaveEvento: chave("checkin-15-dias", referencia),
          });
        }
      }

      const ateReconsulta = diasAte(paciente.proxima_reconsulta_prevista, hoje);
      if (!proxima && ateReconsulta !== null && ateReconsulta <= 7) {
        candidatas.push({
          tipo: "reconsulta_a_confirmar",
          pacienteId: paciente.id,
          motivo: ateReconsulta < 0
            ? `Reconsulta prevista está atrasada há ${Math.abs(ateReconsulta)} dia(s) e ainda não há consulta futura marcada.`
            : `Reconsulta prevista em ${ateReconsulta} dia(s) e ainda não há consulta futura marcada.`,
          prioridade: ateReconsulta <= 0 ? "alta" : "media",
          prazo: paciente.proxima_reconsulta_prevista,
          chaveEvento: chave("reconsulta-prevista", paciente.proxima_reconsulta_prevista),
        });
      }

      const fimPlano = planEndDate(paciente.data_inicio, paciente.plano);
      if (paciente.fluxo_etapa === "09_renovacao_30_dias" && fimPlano) {
        const faltam = Math.max(0, Math.ceil((fimPlano.getTime() - hoje.getTime()) / DIA));
        candidatas.push({
          tipo: "plano_proximo_fim",
          pacienteId: paciente.id,
          motivo: `${paciente.plano ?? "Plano"} termina em ${faltam} dia(s), em ${fimPlano.toLocaleDateString("pt-BR")}. Preparar e apresentar renovação.`,
          prioridade: faltam <= 7 ? "alta" : "media",
          prazo: fimPlano.toISOString(),
          chaveEvento: chave("renovacao-30-dias", fimPlano.toISOString().slice(0, 10)),
        });
      }

      const diasEtapa = diasDesde(paciente.fluxo_updated_at, hoje) ?? 0;
      if (paciente.fluxo_etapa === "10_proposta_enviada") {
        if (diasEtapa >= 3) candidatas.push({
          tipo: "renovacao_proposta_pendente", pacienteId: paciente.id,
          motivo: "Proposta de renovação enviada há pelo menos 3 dias. Fazer primeiro follow-up.", prioridade: "media",
          chaveEvento: chave("renovacao-followup-d3", paciente.fluxo_updated_at),
        });
        if (diasEtapa >= 7) candidatas.push({
          tipo: "renovacao_proposta_pendente", pacienteId: paciente.id,
          motivo: "Proposta de renovação continua sem resposta após 7 dias. Fazer segundo follow-up.", prioridade: "alta",
          chaveEvento: chave("renovacao-followup-d7", paciente.fluxo_updated_at),
        });
      }

      if (paciente.fluxo_etapa === "11_plano_encerrado") {
        if (diasEtapa >= 3) candidatas.push({
          tipo: "reativacao_pendente", pacienteId: paciente.id,
          motivo: "Plano encerrado há pelo menos 3 dias. Fazer primeiro contato pós-encerramento.", prioridade: "media",
          chaveEvento: chave("plano-encerrado-d3", paciente.fluxo_updated_at),
        });
        if (diasEtapa >= 10) candidatas.push({
          tipo: "reativacao_pendente", pacienteId: paciente.id,
          motivo: "Plano encerrado há pelo menos 10 dias. Fazer tentativa de reativação.", prioridade: "alta",
          chaveEvento: chave("plano-encerrado-d10", paciente.fluxo_updated_at),
        });
      }

      if (paciente.fluxo_etapa === "12_reativacao" && diasEtapa >= 30) {
        candidatas.push({
          tipo: "reativacao_pendente", pacienteId: paciente.id,
          motivo: "Paciente em reativação há 30 dias. Revisar se deve permanecer ativo ou ser inativado.", prioridade: "media",
          chaveEvento: chave("reativacao-d30", paciente.fluxo_updated_at),
        });
      }

      if (paciente.fluxo_urgente) {
        candidatas.push({
          tipo: "fluxo_urgente", pacienteId: paciente.id,
          motivo: paciente.fluxo_observacoes || "Paciente marcado como urgente no Fluxo.", prioridade: "alta",
          chaveEvento: chave("fluxo-urgente", paciente.id),
        });
      }

      if (proxima?.data) {
        const horas = (new Date(proxima.data).getTime() - hoje.getTime()) / 3_600_000;
        if (horas >= 0 && horas <= 168) {
          if (!paciente.telefone || !paciente.cpf) candidatas.push({
            tipo: "cadastro_incompleto", pacienteId: paciente.id,
            motivo: "Consulta nos próximos 7 dias e cadastro sem telefone e/ou CPF.", prioridade: "media",
            chaveEvento: chave("cadastro-consulta", proxima.id),
          });
          if (!paciente.data_nascimento) candidatas.push({
            tipo: "nascimento_ausente", pacienteId: paciente.id,
            motivo: "Consulta nos próximos 7 dias e data de nascimento não cadastrada.", prioridade: "media",
            chaveEvento: chave("nascimento-consulta", proxima.id),
          });
        }
      }
    }

    for (const pagamento of pagamentos.filter((p) => p.paciente_id === paciente.id)) {
      if (pagamento.status === "pendente" || pagamento.status === "atrasado") candidatas.push({
        tipo: "pagamento_pendente", pacienteId: paciente.id,
        motivo: pagamento.status === "atrasado" ? "Pagamento em atraso." : "Pagamento pendente.",
        prioridade: pagamento.status === "atrasado" ? "alta" : "media", prazo: pagamento.vencimento,
        chaveEvento: chave("pagamento", pagamento.id),
      });
    }
  }

  const hojeIso = hoje.toISOString().slice(0, 10);
  for (const tarefa of tarefas) {
    if (tarefa.status === "pendente" && tarefa.prazo && tarefa.prazo < hojeIso) candidatas.push({
      tipo: "tarefa_vencida", pacienteId: tarefa.paciente_id, tarefaId: tarefa.id,
      motivo: `Tarefa "${tarefa.titulo}" venceu em ${new Date(tarefa.prazo).toLocaleDateString("pt-BR")}.`,
      prioridade: "alta", prazo: tarefa.prazo, chaveEvento: chave("tarefa", tarefa.id),
    });
  }
  return candidatas;
}

export async function syncPendencias(): Promise<void> {
  await assertAdmin();
  const supabase = await createClient();
  const db = supabase as any;
  const [pacientesR, consultasR, checkinsR, pagamentosR, tarefasR, pendenciasR] = await Promise.all([
    db.from("pacientes").select("*"), db.from("consultas").select("*"), db.from("checkins").select("*"),
    db.from("pagamentos").select("*"), db.from("tarefas").select("*"), db.from("pendencias").select("*"),
  ]);
  const pacientes = (pacientesR.data ?? []) as PacienteOperacional[];
  const agora = new Date();
  await aplicarRenovacaoAutomatica(db, pacientes, agora);
  const candidatas = detectarPendencias(pacientes, consultasR.data ?? [], checkinsR.data ?? [], pagamentosR.data ?? [], tarefasR.data ?? [], agora);
  const porEvento = new Map(candidatas.map((c) => [c.chaveEvento, c]));
  const historico = pendenciasR.data ?? [];
  const eventosExistentes = new Set(historico.map((p: any) => p.chave_evento).filter(Boolean));
  const ativos = historico.filter((p: any) => p.status !== "resolvida");
  const agoraIso = agora.toISOString();

  const resolverIds = ativos
    .filter((p: any) => !p.chave_evento || !porEvento.has(p.chave_evento))
    .map((p: any) => p.id);
  if (resolverIds.length) await db.from("pendencias").update({ status: "resolvida", resolvida_em: agoraIso }).in("id", resolverIds);

  const hojeIso = agoraIso.slice(0, 10);
  const reabrirIds = ativos
    .filter((p: any) => p.status === "adiada" && p.adiada_ate && p.adiada_ate <= hojeIso && p.chave_evento && porEvento.has(p.chave_evento))
    .map((p: any) => p.id);
  if (reabrirIds.length) await db.from("pendencias").update({ status: "pendente" }).in("id", reabrirIds);

  const novas = candidatas.filter((c) => !eventosExistentes.has(c.chaveEvento));
  if (novas.length) await db.from("pendencias").insert(novas.map((c) => ({
    tipo: c.tipo, paciente_id: c.pacienteId, tarefa_id: c.tarefaId ?? null, consulta_id: c.consultaId ?? null,
    motivo: c.motivo, prioridade: c.prioridade, prazo: c.prazo ?? null, chave_evento: c.chaveEvento,
  })));
}

export async function resolverPendenciaAction(id: string): Promise<ActionResult> {
  const { adminId } = await assertAdminComNivel();
  const supabase = await createClient();
  const db = supabase as any;
  const { data: pendencia } = await db.from("pendencias").select("tipo,paciente_id").eq("id", id).maybeSingle();
  if (pendencia?.tipo === "fluxo_urgente" && pendencia.paciente_id) {
    await db.from("pacientes").update({ fluxo_urgente: false }).eq("id", pendencia.paciente_id);
  }
  const { error } = await db.from("pendencias").update({ status: "resolvida", resolvida_em: new Date().toISOString(), resolvida_por: adminId }).eq("id", id);
  if (error) return { success: false, message: `Erro ao resolver pendência: ${error.message}` };
  revalidatePath("/clara");
  return { success: true, message: "Pendência resolvida." };
}

export async function adiarPendenciaAction(id: string, ateIso: string): Promise<ActionResult> {
  await assertAdmin();
  const supabase = await createClient();
  const { error } = await (supabase as any).from("pendencias").update({ status: "adiada", adiada_ate: ateIso }).eq("id", id);
  if (error) return { success: false, message: `Erro ao adiar pendência: ${error.message}` };
  revalidatePath("/clara");
  return { success: true, message: "Pendência adiada." };
}
