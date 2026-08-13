export const LEAD_STAGES = [
  { key: "01_lead_recebido", label: "01 — Lead recebido", color: "slate" },
  { key: "02_qualificacao", label: "02 — Qualificação", color: "amber" },
  { key: "03_planos_apresentados", label: "03 — Planos apresentados", color: "amber" },
  { key: "04_lead_d2", label: "Lead D2", color: "sky" },
  { key: "05_lead_d4", label: "Lead D4", color: "sky" },
  { key: "06_lead_d8", label: "Lead D8", color: "sky" },
  { key: "07_lead_d14", label: "Lead D14", color: "sky" },
  { key: "08_lead_d21", label: "Lead D21", color: "sky" },
  { key: "09_lead_d30", label: "Lead D30", color: "sky" },
  { key: "10_proposta_d1", label: "Proposta D+1", color: "amber" },
  { key: "11_proposta_d3", label: "Proposta D+3", color: "amber" },
  { key: "12_proposta_d6", label: "Proposta D+6", color: "amber" },
  { key: "13_proposta_d10", label: "Proposta D+10", color: "amber" },
  { key: "14_interessado_proximo_mes", label: "Interessado próximo mês", color: "amber" },
  { key: "15_nao_respondeu", label: "Não respondeu", color: "rose" },
  { key: "16_convertido", label: "Convertido", color: "slate" },
] as const;
export type LeadStageKey = (typeof LEAD_STAGES)[number]["key"];
