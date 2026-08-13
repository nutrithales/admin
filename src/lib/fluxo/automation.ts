import type { FlowStageKey } from "@/lib/fluxo/stages";

export interface FlowAutomaticRule {
  afterDays: number;
  nextStage?: FlowStageKey;
}

export const FLOW_AUTOMATIC_RULES: Partial<Record<FlowStageKey, FlowAutomaticRule>> = {};

export function addCalendarDays(base: Date, days: number): Date {
  const result = new Date(base);
  result.setDate(result.getDate() + days);
  return result;
}

export function automaticNextActionForStage(stage: string | null | undefined, base = new Date()): string | null {
  const rule = FLOW_AUTOMATIC_RULES[stage as FlowStageKey];
  return rule ? addCalendarDays(base, rule.afterDays).toISOString() : null;
}
