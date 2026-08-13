export const FLOW_STAGES = [
  { key: "04_agendado", label: "04 — Agendado", group: "atendimento", color: "sky" },
  { key: "05_pre_consulta_concluida", label: "05 — Pré-consulta concluída", group: "atendimento", color: "sky" },
  { key: "06_plano_elaboracao", label: "06 — Plano em elaboração", group: "acompanhamento", color: "amber" },
  { key: "07_acompanhamento_ativo", label: "07 — Acompanhamento ativo", group: "acompanhamento", color: "green" },
  { key: "08_aguardando_resposta", label: "08 — Aguardando resposta", group: "acompanhamento", color: "stone" },
  { key: "09_renovacao_30_dias", label: "09 — Renovação em 30 dias", group: "renovação", color: "orange" },
  { key: "10_proposta_enviada", label: "10 — Proposta enviada", group: "renovação", color: "orange" },
  { key: "11_plano_encerrado", label: "11 — Plano encerrado", group: "renovação", color: "red" },
  { key: "12_reativacao", label: "12 — Reativação", group: "renovação", color: "rose" },
  { key: "pausa_acompanhamento", label: "Pausa no acompanhamento", group: "outros", color: "stone" },
] as const;

export type FlowStageKey = (typeof FLOW_STAGES)[number]["key"];
export type FlowGroup = (typeof FLOW_STAGES)[number]["group"];

export const FLOW_GROUPS = [
  { key: "atendimento", label: "Atendimento" },
  { key: "acompanhamento", label: "Acompanhamento" },
  { key: "renovação", label: "Renovação" },
  { key: "outros", label: "Outros" },
] as const;

export function getFlowStage(key?: string | null) {
  return FLOW_STAGES.find((stage) => stage.key === key) ?? FLOW_STAGES[0];
}
