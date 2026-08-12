export const LEAD_STAGES = [
  { key: "01_lead_recebido", label: "01 — Lead recebido", color: "slate" },
  { key: "02_qualificacao", label: "02 — Qualificação", color: "amber" },
  { key: "03_planos_apresentados", label: "03 — Planos apresentados", color: "amber" },
  { key: "04_followup_lead", label: "04 — Follow-up lead", color: "sky" },
  { key: "05_followup_proposta", label: "05 — Follow-up proposta", color: "sky" },
  { key: "06_interessado_proximo_mes", label: "06 — Interessado próximo mês", color: "amber" },
  { key: "07_nao_respondeu", label: "07 — Não respondeu", color: "rose" },
  { key: "08_convertido", label: "08 — Convertido", color: "slate" },
] as const;

export type LeadStageKey = (typeof LEAD_STAGES)[number]["key"];
