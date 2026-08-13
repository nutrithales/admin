import type { FlowStageKey } from "@/lib/fluxo/stages";

export interface FlowAutomaticRule {
  afterDays: number;
  nextStage?: FlowStageKey;
}

export const FLOW_AUTOMATIC_RULES: Partial<Record<FlowStageKey, FlowAutomaticRule>> = {
  "06_consulta_realizada": { afterDays: 1, nextStage: "06_1_montar_plano" },
  "08_plano_entregue": { afterDays: 3 },
  "09_checkin_3_dias": { afterDays: 4 },
  "10_checkin_7_dias": { afterDays: 7 },
  "14_plano_encerrado": { afterDays: 10 },
  "15_reativacao_pendente": { afterDays: 3 },
};

export function addCalendarDays(base: Date, days: number): Date {
  const result = new Date(base);
  result.setDate(result.getDate() + days);
  return result;
}

export function automaticNextActionForStage(
  stage: string | null | undefined,
  base = new Date(),
): string | null {
  const rule = FLOW_AUTOMATIC_RULES[stage as FlowStageKey];
  return rule ? addCalendarDays(base, rule.afterDays).toISOString() : null;
}
