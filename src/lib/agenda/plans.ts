export const PLAN_OPTIONS = [
  { value: "Consulta Avulsa", label: "Consulta Avulsa", consultas: 1, duracaoMeses: null },
  { value: "Plano Essencial", label: "Plano Essencial", consultas: 3, duracaoMeses: 4 },
  { value: "Plano Evolução", label: "Plano Evolução", consultas: 6, duracaoMeses: 8 },
  { value: "Plano Elite Premium", label: "Plano Elite Premium", consultas: 9, duracaoMeses: 12 },
] as const;

export function includedConsultations(plan?: string | null) {
  const normalized = (plan ?? "").toLocaleLowerCase("pt-BR");
  if (normalized.includes("elite")) return 9;
  if (normalized.includes("evolu")) return 6;
  if (normalized.includes("essencial")) return 3;
  return 1;
}

export function planDurationMonths(plan?: string | null): number | null {
  const normalized = (plan ?? "").toLocaleLowerCase("pt-BR");
  if (normalized.includes("elite")) return 12;
  if (normalized.includes("evolu")) return 8;
  if (normalized.includes("essencial")) return 4;
  return null;
}

/**
 * Término contratual do acompanhamento. É calculado exclusivamente pela
 * data de início + duração comercial do plano; consultas agendadas,
 * realizadas ou restantes não alteram essa data.
 *
 * A Consulta Avulsa vence 31 dias após o início. Os planos de acompanhamento
 * usam sua duração comercial em meses.
 */
export function planEndDate(dataInicio?: string | null, plan?: string | null): Date | null {
  if (!dataInicio) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(dataInicio);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;

  const normalizedPlan = (plan ?? "").toLocaleLowerCase("pt-BR");
  if (normalizedPlan.includes("avulsa")) {
    const endDate = new Date(Date.UTC(year, month, day, 12, 0, 0));
    endDate.setUTCDate(endDate.getUTCDate() + 31);
    return endDate;
  }

  const months = planDurationMonths(plan);
  if (months === null) return null;

  const firstTargetDay = new Date(Date.UTC(year, month + months, 1, 12, 0, 0));
  const targetYear = firstTargetDay.getUTCFullYear();
  const targetMonth = firstTargetDay.getUTCMonth();
  const lastDay = new Date(Date.UTC(targetYear, targetMonth + 1, 0, 12, 0, 0)).getUTCDate();

  return new Date(Date.UTC(targetYear, targetMonth, Math.min(day, lastDay), 12, 0, 0));
}

export function normalizePlan(plan?: string | null) {
  const normalized = (plan ?? "").toLocaleLowerCase("pt-BR");
  if (normalized.includes("elite")) return "Plano Elite Premium";
  if (normalized.includes("evolu")) return "Plano Evolução";
  if (normalized.includes("essencial")) return "Plano Essencial";
  if (normalized.includes("avulsa")) return "Consulta Avulsa";
  return plan?.trim() || "Consulta Avulsa";
}
