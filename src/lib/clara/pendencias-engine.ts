import type { Tables } from "@/types/database.types";
import { computeConsultasStats } from "@/lib/clara/consultas";
import { checkinSituacao, diasDesde } from "@/lib/clara/checkins";
import { getFlowStage, type FlowStageKey } from "@/lib/fluxo/stages";

/** Etapas em que a consulta já aconteceu mas o plano ainda não foi
 * marcado como entregue — usado pela central de pendências. Uma
 * consulta concluída avança automaticamente para "06_1_montar_plano"
 * (ver PATCH /api/agenda e updateConsultaStatusAction). */
const ETAPAS_AGUARDANDO_PLANO: readonly FlowStageKey[] = [
  "06_consulta_realizada",
  "06_1_montar_plano",
  "07_pos_consulta_enviado",
];

export type PendenciaTipo =
  | "consulta_nao_confirmada"
  | "sem_proxima_consulta"
  | "checkin_pendente_envio"
  | "checkin_nao_respondido"
  | "checkin_3_dias_pendente"
  | "checkin_7_dias_pendente"
  | "reconsulta_a_confirmar"
  | "plano_proximo_fim"
  | "plano_finalizado"
  | "renovacao_proposta_pendente"
  | "reativacao_pendente"
  | "pagamento_pendente"
  | "aguardando_plano_alimentar"
  | "sem_movimentacao"
  | "cadastro_incompleto"
  | "nascimento_ausente"
  | "contato_necessario"
  | "fluxo_urgente"
  | "tarefa_vencida";

export type PendenciaPrioridade = "baixa" | "media" | "alta";

export const PENDENCIA_TIPO_LABEL: Record<PendenciaTipo, string> = {
  consulta_nao_confirmada: "Consulta não confirmada",
  sem_proxima_consulta: "Sem próxima consulta",
  checkin_pendente_envio: "Check-in a enviar",
  checkin_nao_respondido: "Check-in sem resposta",
  checkin_3_dias_pendente: "Check-in de 3 dias (pós-plano)",
  checkin_7_dias_pendente: "Check-in de 7 dias (pós-plano)",
  reconsulta_a_confirmar: "Reconsulta a confirmar",
  plano_proximo_fim: "Plano perto do fim",
  plano_finalizado: "Plano finalizado",
  renovacao_proposta_pendente: "Proposta de renovação pendente",
  reativacao_pendente: "Reativação pendente",
  pagamento_pendente: "Pagamento pendente",
  aguardando_plano_alimentar: "Aguardando plano alimentar",
  sem_movimentacao: "Sem movimentação no Fluxo",
  cadastro_incompleto: "Cadastro incompleto",
  nascimento_ausente: "Data de nascimento ausente",
  contato_necessario: "Ação do Fluxo atrasada",
  fluxo_urgente: "Marcado como urgente no Fluxo",
  tarefa_vencida: "Tarefa vencida",
};

/** Modelo de mensagem (chave em `mensagens_modelos`) sugerido para cada
 * tipo de pendência, quando fizer sentido resolver mandando uma
 * mensagem pronta pelo WhatsApp. A Clara só prepara e abre o WhatsApp
 * com o texto preenchido — quem revisa e manda é sempre uma pessoa. */
export const PENDENCIA_MENSAGEM_SUGERIDA: Partial<Record<PendenciaTipo, string>> = {
  consulta_nao_confirmada: "confirmacao_consulta",
  sem_proxima_consulta: "novo_link_agendamento",
  checkin_pendente_envio: "envio_checkin",
  checkin_nao_respondido: "lembrete_checkin",
  checkin_3_dias_pendente: "checkin_3_dias",
  checkin_7_dias_pendente: "checkin_7_dias",
  reconsulta_a_confirmar: "confirmar_reconsulta",
  plano_proximo_fim: "renovacao_plano",
  plano_finalizado: "renovacao_plano",
  renovacao_proposta_pendente: "proposta_renovacao",
  reativacao_pendente: "reativacao_paciente",
  pagamento_pendente: "cobranca_pagamento",
  contato_necessario: "reativacao_paciente",
};

/** Ação direta (sem mensagem) que já resolve o motivo da pendência de
 * verdade — em vez de só marcar a pendência como resolvida por fora. */
export type PendenciaAcaoDireta =
  | "confirmar_consulta"
  | "enviar_checkin"
  | "concluir_tarefa"
  | "avancar_checkin_3_dias"
  | "avancar_checkin_7_dias"
  | "avancar_reconsulta"
  | "avancar_proposta_renovacao"
  | "avancar_reativacao";

export const PENDENCIA_ACAO_DIRETA: Partial<Record<PendenciaTipo, PendenciaAcaoDireta>> = {
  consulta_nao_confirmada: "confirmar_consulta",
  checkin_pendente_envio: "enviar_checkin",
  tarefa_vencida: "concluir_tarefa",
  checkin_3_dias_pendente: "avancar_checkin_3_dias",
  checkin_7_dias_pendente: "avancar_checkin_7_dias",
  reconsulta_a_confirmar: "avancar_reconsulta",
  renovacao_proposta_pendente: "avancar_proposta_renovacao",
  reativacao_pendente: "avancar_reativacao",
};

export interface PendenciaCandidata {
  tipo: PendenciaTipo;
  pacienteId: string | null;
  tarefaId?: string | null;
  consultaId?: string | null;
  motivo: string;
  prioridade: PendenciaPrioridade;
  prazo?: string | null;
}

export interface DetectarPendenciasInput {
  pacientes: Tables<"pacientes">[];
  consultas: Tables<"consultas">[];
  checkins: Tables<"checkins">[];
  pagamentos: Tables<"pagamentos">[];
  tarefas: Tables<"tarefas">[];
  ultimaMovimentacaoPorPaciente: Map<string, string>; // paciente_id -> created_at ISO
  hoje?: Date;
}

const SEM_MOVIMENTACAO_DIAS = 30;
const CHECKIN_3_DIAS = 3;
const CHECKIN_7_DIAS_APOS_ETAPA_3 = 4; // + os 3 dias já passados = ~7 dias desde a entrega do plano
const RECONSULTA_DIAS_APOS_CHECKIN_7 = 10; // dias em "10_checkin_7_dias" sem reconsulta marcada
const RENOVACAO_PROPOSTA_DIAS = 7; // dias em "12_renovacao_30_dias" antes de propor renovação
const RENOVACAO_REATIVACAO_DIAS = 23; // dias em "13_proposta_renovacao" antes de escalar (7 + 23 = ~30 dias do fim do plano)

function horasAteConsulta(dataIso: string | null, hoje: Date): number | null {
  if (!dataIso) return null;
  return (new Date(dataIso).getTime() - hoje.getTime()) / (1000 * 60 * 60);
}

/** Motor puro de detecção de pendências — recebe os dados já carregados do
 * banco e devolve candidatos. Não decide nada clínico, só sinaliza
 * situações administrativas que precisam de atenção humana. */
export function detectarPendencias(input: DetectarPendenciasInput): PendenciaCandidata[] {
  const hoje = input.hoje ?? new Date();
  const candidatas: PendenciaCandidata[] = [];

  const consultasPorAuth = new Map<string, Tables<"consultas">[]>();
  for (const c of input.consultas) {
    const list = consultasPorAuth.get(c.auth_id) ?? [];
    list.push(c);
    consultasPorAuth.set(c.auth_id, list);
  }

  const ultimoCheckinPorAuth = new Map<string, Tables<"checkins">>();
  for (const chk of input.checkins) {
    const atual = ultimoCheckinPorAuth.get(chk.auth_id);
    const dataAtual = atual ? new Date(atual.respondido_em ?? atual.enviado_em ?? atual.created_at ?? 0) : null;
    const dataChk = new Date(chk.respondido_em ?? chk.enviado_em ?? chk.created_at ?? 0);
    if (!atual || dataChk > dataAtual!) ultimoCheckinPorAuth.set(chk.auth_id, chk);
  }

  const pagamentosPorPaciente = new Map<string, Tables<"pagamentos">[]>();
  for (const pg of input.pagamentos) {
    const list = pagamentosPorPaciente.get(pg.paciente_id) ?? [];
    list.push(pg);
    pagamentosPorPaciente.set(pg.paciente_id, list);
  }

  for (const paciente of input.pacientes) {
    const ativo = paciente.status === "ativo";
    const consultasDoPaciente = consultasPorAuth.get(paciente.auth_id) ?? [];
    const stats = computeConsultasStats(paciente, consultasDoPaciente);

    // Consulta próxima ainda não confirmada (próximas 48h).
    for (const consulta of consultasDoPaciente) {
      if (consulta.status !== "agendada") continue;
      const horas = horasAteConsulta(consulta.data, hoje);
      if (horas !== null && horas >= 0 && horas <= 48) {
        candidatas.push({
          tipo: "consulta_nao_confirmada",
          pacienteId: paciente.id,
          consultaId: consulta.id,
          motivo: `Consulta em ${new Date(consulta.data!).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })} ainda não confirmada.`,
          prioridade: horas <= 24 ? "alta" : "media",
          prazo: consulta.data,
        });
      }
    }

    if (ativo) {
      // Sem próxima consulta agendada.
      const temProxima = consultasDoPaciente.some(
        (c) => (c.status === "agendada" || c.status === "confirmada") && c.data && new Date(c.data) >= hoje,
      );
      if (!temProxima) {
        candidatas.push({
          tipo: "sem_proxima_consulta",
          pacienteId: paciente.id,
          motivo: "Paciente ativo sem nenhuma consulta futura agendada.",
          prioridade: "media",
        });
      }

      // Check-in.
      const ultimoCheckin = ultimoCheckinPorAuth.get(paciente.auth_id) ?? null;
      const situacao = checkinSituacao(ultimoCheckin, paciente.data_inicio, hoje);
      if (situacao === "pendente_envio") {
        candidatas.push({
          tipo: "checkin_pendente_envio",
          pacienteId: paciente.id,
          motivo: "Check-in quinzenal ainda não enviado.",
          prioridade: "media",
        });
      } else if (situacao === "aguardando_resposta" || situacao === "atrasado") {
        candidatas.push({
          tipo: "checkin_nao_respondido",
          pacienteId: paciente.id,
          motivo:
            situacao === "atrasado"
              ? "Check-in enviado, resposta em atraso."
              : "Check-in enviado, aguardando resposta.",
          prioridade: situacao === "atrasado" ? "alta" : "baixa",
        });
      }

      // `fluxo_updated_at` marca desde quando o paciente está na etapa
      // atual do Fluxo — cada avanço de etapa reinicia essa contagem.
      // Usado tanto pelo funil de renovação quanto pelos check-ins abaixo.
      const diasNaEtapa = diasDesde(paciente.fluxo_updated_at, hoje);

      // Plano — funil de renovação. Consulta com restantes=0 já avança o
      // Fluxo automaticamente para "12_renovacao_30_dias" (ver
      // updateConsultaStatusAction / PATCH /api/agenda), então a etapa em
      // si é quem dita a escalada: 0-7 dias = renovação inicial, 7-30 dias
      // = proposta de renovação, 30+ dias = reativação pendente.
      if (paciente.fluxo_etapa === "13_proposta_renovacao") {
        if (diasNaEtapa !== null && diasNaEtapa >= RENOVACAO_REATIVACAO_DIAS) {
          candidatas.push({
            tipo: "reativacao_pendente",
            pacienteId: paciente.id,
            motivo: `Proposta de renovação enviada há ${diasNaEtapa} dias sem resposta. Hora de tentar reativar.`,
            prioridade: "alta",
          });
        }
      } else if (paciente.fluxo_etapa === "12_renovacao_30_dias") {
        if (diasNaEtapa !== null && diasNaEtapa >= RENOVACAO_PROPOSTA_DIAS) {
          candidatas.push({
            tipo: "renovacao_proposta_pendente",
            pacienteId: paciente.id,
            motivo: `${paciente.plano ?? "Plano"} finalizado há ${diasNaEtapa} dias sem renovação. Hora de mandar a proposta.`,
            prioridade: "alta",
          });
        } else {
          candidatas.push({
            tipo: "plano_finalizado",
            pacienteId: paciente.id,
            motivo: `${paciente.plano ?? "Plano"} finalizado (${stats.realizadas}/${paciente.consultas_incluidas} consultas). Renovação necessária.`,
            prioridade: "alta",
          });
        }
      } else if (stats.planoFinalizado) {
        // Caso de borda: restantes=0 mas o Fluxo não está na etapa de
        // renovação (dado legado, ou avanço manual) — ainda sinaliza.
        candidatas.push({
          tipo: "plano_finalizado",
          pacienteId: paciente.id,
          motivo: `${paciente.plano ?? "Plano"} finalizado (${stats.realizadas}/${paciente.consultas_incluidas} consultas). Renovação necessária.`,
          prioridade: "alta",
        });
      } else if (stats.ultimaConsultaDoPlano) {
        candidatas.push({
          tipo: "plano_proximo_fim",
          pacienteId: paciente.id,
          motivo: `Paciente está na última consulta incluída no ${paciente.plano ?? "plano"}.`,
          prioridade: "media",
        });
      }

      // Fluxo (sistema já existente: fluxo_etapa / fluxo_urgente / fluxo_proxima_acao_em).
      if (paciente.fluxo_urgente) {
        candidatas.push({
          tipo: "fluxo_urgente",
          pacienteId: paciente.id,
          motivo: paciente.fluxo_observacoes || "Paciente marcado como urgente no Fluxo.",
          prioridade: "alta",
        });
      }

      if (paciente.fluxo_proxima_acao_em) {
        const proximaAcao = new Date(paciente.fluxo_proxima_acao_em);
        if (proximaAcao <= hoje) {
          candidatas.push({
            tipo: "contato_necessario",
            pacienteId: paciente.id,
            motivo: `Próxima ação do Fluxo (${getFlowStage(paciente.fluxo_etapa).label}) estava marcada para ${proximaAcao.toLocaleDateString("pt-BR")}.`,
            prioridade: "media",
          });
        }
      } else {
        // Sem próxima ação marcada: cai no fallback de "sem movimentação"
        // usando o histórico registrado pela Clara (fluxo_movimentacoes).
        const ultimaMovimentacao = input.ultimaMovimentacaoPorPaciente.get(paciente.id);
        const diasParado = diasDesde(ultimaMovimentacao ?? paciente.fluxo_updated_at, hoje);
        if (diasParado !== null && diasParado >= SEM_MOVIMENTACAO_DIAS) {
          candidatas.push({
            tipo: "sem_movimentacao",
            pacienteId: paciente.id,
            motivo: `Sem movimentação no Fluxo há ${diasParado} dias (etapa: ${getFlowStage(paciente.fluxo_etapa).label}).`,
            prioridade: "baixa",
          });
        }
      }

      if (ETAPAS_AGUARDANDO_PLANO.includes(paciente.fluxo_etapa as FlowStageKey)) {
        candidatas.push({
          tipo: "aguardando_plano_alimentar",
          pacienteId: paciente.id,
          motivo:
            paciente.fluxo_etapa === "06_1_montar_plano"
              ? "Consulta realizada — plano alimentar precisa ser montado."
              : "Paciente aguardando entrega do plano alimentar.",
          prioridade: "media",
        });
      }

      // Check-ins de acompanhamento pós-entrega do plano (3 e 7 dias).
      if (paciente.fluxo_etapa === "08_plano_entregue" && diasNaEtapa !== null && diasNaEtapa >= CHECKIN_3_DIAS) {
        candidatas.push({
          tipo: "checkin_3_dias_pendente",
          pacienteId: paciente.id,
          motivo: `Plano entregue há ${diasNaEtapa} dias — hora do check-in de 3 dias.`,
          prioridade: "media",
        });
      } else if (
        paciente.fluxo_etapa === "09_checkin_3_dias" &&
        diasNaEtapa !== null &&
        diasNaEtapa >= CHECKIN_7_DIAS_APOS_ETAPA_3
      ) {
        candidatas.push({
          tipo: "checkin_7_dias_pendente",
          pacienteId: paciente.id,
          motivo: "Uma semana após a entrega do plano — hora do check-in de 7 dias.",
          prioridade: "media",
        });
      } else if (
        paciente.fluxo_etapa === "10_checkin_7_dias" &&
        diasNaEtapa !== null &&
        diasNaEtapa >= RECONSULTA_DIAS_APOS_CHECKIN_7 &&
        stats.restantes > 0 &&
        !temProxima
      ) {
        // Ainda dentro do plano (restam consultas), check-ins já feitos e
        // nenhuma próxima consulta marcada — hora de lembrar de agendar a
        // reconsulta antes que o plano acabe sem acompanhamento.
        candidatas.push({
          tipo: "reconsulta_a_confirmar",
          pacienteId: paciente.id,
          motivo: `${diasNaEtapa} dias desde o check-in de 7 dias e ainda sem a próxima consulta marcada.`,
          prioridade: "media",
        });
      }

      // Cadastro.
      if (!paciente.telefone || !paciente.cpf) {
        candidatas.push({
          tipo: "cadastro_incompleto",
          pacienteId: paciente.id,
          motivo: "Cadastro incompleto (telefone e/ou CPF ausente).",
          prioridade: "baixa",
        });
      }
      if (!paciente.data_nascimento && consultasDoPaciente.length > 0) {
        candidatas.push({
          tipo: "nascimento_ausente",
          pacienteId: paciente.id,
          motivo: "Primeira consulta sem data de nascimento registrada.",
          prioridade: "media",
        });
      }
    }

    // Pagamentos (independe do status do paciente).
    for (const pagamento of pagamentosPorPaciente.get(paciente.id) ?? []) {
      if (pagamento.status === "pendente" || pagamento.status === "atrasado") {
        candidatas.push({
          tipo: "pagamento_pendente",
          pacienteId: paciente.id,
          motivo: pagamento.status === "atrasado" ? "Pagamento em atraso." : "Pagamento pendente.",
          prioridade: pagamento.status === "atrasado" ? "alta" : "media",
          prazo: pagamento.vencimento,
        });
      }
    }
  }

  // Tarefas vencidas.
  const hojeIso = hoje.toISOString().slice(0, 10);
  for (const tarefa of input.tarefas) {
    if (tarefa.status === "pendente" && tarefa.prazo && tarefa.prazo < hojeIso) {
      candidatas.push({
        tipo: "tarefa_vencida",
        pacienteId: tarefa.paciente_id,
        tarefaId: tarefa.id,
        motivo: `Tarefa "${tarefa.titulo}" venceu em ${new Date(tarefa.prazo).toLocaleDateString("pt-BR")}.`,
        prioridade: "alta",
        prazo: tarefa.prazo,
      });
    }
  }

  return candidatas;
}
