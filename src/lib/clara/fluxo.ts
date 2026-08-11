/**
 * Etapas do Fluxo de pacientes — **sistema já existente e em uso**,
 * gerenciado por fora deste painel (o funil e os nomes das etapas já
 * estavam aplicados em produção antes da Clara). `pacientes.fluxo_etapa`
 * tem uma CHECK constraint fixa no banco com exatamente estes valores —
 * ao contrário de outros campos "texto livre" do projeto, este é um
 * enum fechado. Não adicione/renomeie etapa aqui sem alterar também a
 * constraint em banco (e coordenar com quem mais usa esse funil).
 */
export const FLUXO_ETAPAS = [
  "01_lead_recebido",
  "02_qualificacao",
  "03_planos_apresentados",
  "follow_up_1",
  "follow_up_2",
  "follow_up_3",
  "04_agendado",
  "04_1_agendado_reconsulta",
  "05_formulario_materiais",
  "06_consulta_realizada",
  "07_pos_consulta_enviado",
  "08_plano_entregue",
  "09_checkin_3_dias",
  "10_checkin_7_dias",
  "11_confirmar_reconsulta",
  "11_1_aguardando_resposta",
  "12_renovacao_30_dias",
  "13_proposta_renovacao",
  "14_plano_encerrado",
  "15_reativacao_pendente",
  "16_renovado",
  "nada_agora",
  "mandar_mensagem",
  "pausa_acompanhamento",
] as const;

export type FluxoEtapa = (typeof FLUXO_ETAPAS)[number];

export const FLUXO_ETAPA_LABEL: Record<FluxoEtapa, string> = {
  "01_lead_recebido": "Lead recebido",
  "02_qualificacao": "Qualificação",
  "03_planos_apresentados": "Planos apresentados",
  follow_up_1: "Follow-up 1",
  follow_up_2: "Follow-up 2",
  follow_up_3: "Follow-up 3",
  "04_agendado": "Agendado",
  "04_1_agendado_reconsulta": "Agendado (reconsulta)",
  "05_formulario_materiais": "Formulário/materiais enviados",
  "06_consulta_realizada": "Consulta realizada",
  "07_pos_consulta_enviado": "Pós-consulta enviado",
  "08_plano_entregue": "Plano entregue",
  "09_checkin_3_dias": "Check-in 3 dias",
  "10_checkin_7_dias": "Check-in 7 dias",
  "11_confirmar_reconsulta": "Confirmar reconsulta",
  "11_1_aguardando_resposta": "Aguardando resposta",
  "12_renovacao_30_dias": "Renovação em 30 dias",
  "13_proposta_renovacao": "Proposta de renovação",
  "14_plano_encerrado": "Plano encerrado",
  "15_reativacao_pendente": "Reativação pendente",
  "16_renovado": "Renovado",
  nada_agora: "Nada agora",
  mandar_mensagem: "Mandar mensagem",
  pausa_acompanhamento: "Pausa no acompanhamento",
};

export function fluxoEtapaLabel(etapa: string): string {
  return FLUXO_ETAPA_LABEL[etapa as FluxoEtapa] ?? etapa;
}

/** Etapas em que a consulta já aconteceu mas o plano ainda não foi
 * marcado como entregue — usado pela central de pendências. */
export const ETAPAS_AGUARDANDO_PLANO: readonly FluxoEtapa[] = [
  "06_consulta_realizada",
  "07_pos_consulta_enviado",
];
