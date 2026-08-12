export const LEAD_STAGES = [
  { key: "01_lead_recebido", label: "01 — Lead recebido", color: "slate" },
  { key: "02_qualificacao", label: "02 — Qualificação", color: "amber" },
  { key: "03_planos_apresentados", label: "03 — Planos apresentados", color: "amber" },
  { key: "follow_up_1", label: "Follow up 1", color: "sky" },
  { key: "follow_up_2", label: "Follow up 2", color: "sky" },
  { key: "follow_up_3", label: "Follow up 3", color: "rose" },
] as const;

export type LeadStageKey = (typeof LEAD_STAGES)[number]["key"];
