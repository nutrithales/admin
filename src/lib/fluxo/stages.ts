export const FLOW_STAGES = [
  { key: "01_lead_recebido", label: "01 — Lead recebido", group: "captação", color: "slate" },
  { key: "02_qualificacao", label: "02 — Qualificação", group: "captação", color: "amber" },
  { key: "03_planos_apresentados", label: "03 — Planos apresentados", group: "captação", color: "amber" },
  { key: "follow_up_1", label: "Follow up 1", group: "captação", color: "amber" },
  { key: "follow_up_2", label: "Follow up 2", group: "captação", color: "amber" },
  { key: "follow_up_3", label: "Follow up 3", group: "captação", color: "amber" },
  { key: "04_agendado", label: "04 — Agendado", group: "atendimento", color: "sky" },
  { key: "04_1_agendado_reconsulta", label: "04.1 — Agendado (reconsulta)", group: "atendimento", color: "rose" },
  { key: "05_formulario_materiais", label: "05 — Formulário e materiais enviados", group: "atendimento", color: "sky" },
  { key: "06_consulta_realizada", label: "06 — Consulta realizada", group: "acompanhamento", color: "green" },
  { key: "06_1_montar_plano", label: "06.1 — Montar plano", group: "acompanhamento", color: "amber" },
  { key: "07_pos_consulta_enviado", label: "07 — Pós-consulta enviado", group: "acompanhamento", color: "green" },
  { key: "08_plano_entregue", label: "08 — Plano entregue", group: "acompanhamento", color: "green" },
  { key: "09_checkin_3_dias", label: "09 — Check-in 3 dias", group: "acompanhamento", color: "green" },
  { key: "10_checkin_7_dias", label: "10 — Check-in 7 dias", group: "acompanhamento", color: "green" },
  { key: "11_confirmar_reconsulta", label: "11 — Confirmar reconsulta", group: "acompanhamento", color: "green" },
  { key: "11_1_aguardando_resposta", label: "11.1 — Aguardando resposta", group: "acompanhamento", color: "stone" },
  { key: "12_renovacao_30_dias", label: "12 — Renovação em 30 dias", group: "renovação", color: "orange" },
  { key: "13_proposta_renovacao", label: "13 — Proposta de renovação", group: "renovação", color: "orange" },
  { key: "14_plano_encerrado", label: "14 — Plano encerrado", group: "renovação", color: "red" },
  { key: "15_reativacao_pendente", label: "15 — Reativação pendente", group: "renovação", color: "rose" },
  { key: "16_renovado", label: "16 — Renovado", group: "renovação", color: "violet" },
  { key: "nada_agora", label: "Nada agora", group: "outros", color: "stone" },
  { key: "mandar_mensagem", label: "Mandar mensagem", group: "outros", color: "amber" },
  { key: "pausa_acompanhamento", label: "Pausa no acompanhamento", group: "outros", color: "stone" },
] as const;

export type FlowStageKey = (typeof FLOW_STAGES)[number]["key"];
export type FlowGroup = (typeof FLOW_STAGES)[number]["group"];

export const FLOW_GROUPS = [
  { key: "captação", label: "Captação" },
  { key: "atendimento", label: "Atendimento" },
  { key: "acompanhamento", label: "Acompanhamento" },
  { key: "renovação", label: "Renovação" },
  { key: "outros", label: "Outros" },
] as const;

export function getFlowStage(key?: string | null) {
  return FLOW_STAGES.find((stage) => stage.key === key) ?? FLOW_STAGES[0];
}
