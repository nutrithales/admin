export const PLAN_OPTIONS = [
  { value: "Consulta Avulsa", label: "Consulta Avulsa", consultas: 1, duracaoMeses: null },
  { value: "Plano Essencial", label: "Plano Essencial", consultas: 3, duracaoMeses: 4 },
  { value: "Plano Evolução", label: "Plano Evolução", consultas: 6, duracaoMeses: 8 },
  { value: "Plano Elite Premium", label: "Plano Elite Premium", consultas: 9, duracaoMeses: 12 },
] as const;

/** Términos históricos conferidos com a base antiga do Notion.
 * Apenas contratos antigos recebem override; novas contratações continuam
 * usando a duração comercial atual (Essencial 4 meses, Evolução 8 meses). */
const LEGACY_PLAN_END_DATES: Record<string, string> = {
  "plano evolução|2026-06-06": "2027-04-06",
  "plano evolução|2026-01-10": "2026-11-10",
  "plano evolução|2026-01-23": "2026-11-23",
  "plano essencial|2026-03-27": "2026-08-27",
  "plano evolução|2025-07-07": "2026-05-07",
  "plano evolução|2026-03-01": "2027-01-01",
  "plano essencial|2025-11-08": "2026-04-08",
  "plano evolução|2025-11-26": "2026-09-26",
  "plano evolução|2026-06-15": "2027-04-15",
  "plano essencial|2026-07-13": "2026-12-13",
  "plano evolução|2025-10-30": "2026-08-30",
  "plano essencial|2026-04-18": "2026-09-18",
  "plano evolução|2025-11-07": "2026-09-07",
  "plano evolução|2025-12-12": "2026-09-07",
  "plano evolução|2025-11-08": "2026-09-08",
  "plano essencial|2026-03-16": "2026-08-16",
  "plano evolução|2026-06-26": "2027-04-26",
  "plano essencial|2026-05-19": "2026-10-19",
  "plano essencial|2026-05-18": "2026-10-18",
  "plano evolução|2026-03-09": "2027-01-09",
  "plano evolução|2026-02-07": "2026-12-07",
  "plano essencial|2026-05-15": "2026-10-15",
  "plano evolução|2026-03-16": "2027-01-16",
  "plano essencial|2026-05-25": "2026-10-25",
  "plano essencial|2026-04-22": "2026-09-22",
  "plano essencial|2026-06-01": "2026-11-01",
  "plano evolução|2025-10-02": "2026-08-02",
  "plano evolução|2025-09-11": "2026-07-11",
  "plano evolução|2026-05-18": "2027-03-18",
  "plano essencial|2026-04-29": "2026-09-29",
  "plano essencial|2026-02-10": "2026-07-10",
  "plano essencial|2026-03-08": "2026-08-08",
  "plano essencial|2026-04-01": "2026-09-01",
};

/** Cor visual estável por serviço. Mantém o mesmo plano reconhecível nas
 * listas de pacientes e na agenda, sem misturar cor de plano com status. */
export function planBadgeClassName(plan?: string | null) {
  const normalized = (plan ?? "").toLocaleLowerCase("pt-BR");
  if (normalized.includes("personal trainer")) return "bg-rose-100 text-rose-800";
  if (normalized.includes("consultoria de treino")) return "bg-amber-100 text-amber-800";
  if (normalized.includes("elite")) return "bg-violet-100 text-violet-800";
  if (normalized.includes("evolu")) return "bg-sky-100 text-sky-800";
  if (normalized.includes("essencial")) return "bg-emerald-100 text-emerald-800";
  if (normalized.includes("avulsa")) return "bg-slate-100 text-slate-700";
  return "bg-bg-alt text-muted";
}

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
 * Término contratual do acompanhamento. Contratos antigos previamente
 * conferidos preservam o término originalmente contratado; os demais são
 * calculados pela duração comercial atual do plano.
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
  const legacyEnd = LEGACY_PLAN_END_DATES[`${normalizedPlan}|${dataInicio.slice(0, 10)}`];
  if (legacyEnd) {
    const legacyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(legacyEnd);
    if (legacyMatch) {
      const endYear = Number(legacyMatch[1]);
      const endMonth = Number(legacyMatch[2]) - 1;
      const endDay = Number(legacyMatch[3]);
      if (Number.isFinite(endYear) && Number.isFinite(endMonth) && Number.isFinite(endDay)) {
        return new Date(Date.UTC(endYear, endMonth, endDay, 12, 0, 0));
      }
    }
  }

  if (normalizedPlan.includes("avulsa")) {
    const endDate = new Date(Date.UTC(year, month, day, 12, 0, 0));
    endDate.setUTCDate(endDate.getUTCDate() + 31);
    return endDate;
  }
  if (normalizedPlan.includes("personal trainer")) {
    const firstTargetDay = new Date(Date.UTC(year, month + 1, 1, 12, 0, 0));
    const targetYear = firstTargetDay.getUTCFullYear();
    const targetMonth = firstTargetDay.getUTCMonth();
    const lastDay = new Date(Date.UTC(targetYear, targetMonth + 1, 0, 12, 0, 0)).getUTCDate();
    return new Date(Date.UTC(targetYear, targetMonth, Math.min(day, lastDay), 12, 0, 0));
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
