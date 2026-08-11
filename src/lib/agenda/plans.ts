export const PLAN_OPTIONS = [
  { value: "Consulta Avulsa", label: "Consulta Avulsa", consultas: 1 },
  { value: "Plano Essencial", label: "Plano Essencial", consultas: 3 },
  { value: "Plano Evolução", label: "Plano Evolução", consultas: 6 },
  { value: "Plano Elite Premium", label: "Plano Elite Premium", consultas: 9 },
] as const;

export function includedConsultations(plan?: string | null) {
  const normalized = (plan ?? "").toLocaleLowerCase("pt-BR");
  if (normalized.includes("elite")) return 9;
  if (normalized.includes("evolu")) return 6;
  if (normalized.includes("essencial")) return 3;
  return 1;
}

export function normalizePlan(plan?: string | null) {
  const normalized = (plan ?? "").toLocaleLowerCase("pt-BR");
  if (normalized.includes("elite")) return "Plano Elite Premium";
  if (normalized.includes("evolu")) return "Plano Evolução";
  if (normalized.includes("essencial")) return "Plano Essencial";
  if (normalized.includes("avulsa")) return "Consulta Avulsa";
  return plan?.trim() || "Consulta Avulsa";
}
