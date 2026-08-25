export type RirLoadDirection = "increase" | "maintain" | "decrease";

export type RirLoadSuggestion = {
  nextLoad: number;
  changeKg: number;
  changePct: number;
  direction: RirLoadDirection;
  targetMin: number;
  targetMax: number;
};

function parseNumber(value: string | number) {
  const parsed = Number(String(value).replace(",", ".").replace("+", ""));
  return Number.isFinite(parsed) ? parsed : null;
}

export function parseRirTarget(value: string | null | undefined) {
  const values = String(value || "")
    .match(/\d+(?:[.,]\d+)?/g)
    ?.map((item) => Number(item.replace(",", ".")))
    .filter(Number.isFinite);

  if (!values?.length) return null;
  return { min: Math.min(...values), max: Math.max(...values) };
}

function roundToHalfKg(value: number) {
  return Math.round(value * 2) / 2;
}

/**
 * Conservative within-session load guidance. Each RIR outside the prescribed
 * range changes the next set by 2.5%, capped at 5%, and rounded to 0.5 kg.
 */
export function calculateNextLoad({
  currentLoad,
  actualRir,
  targetRir,
}: {
  currentLoad: string | number;
  actualRir: string | number;
  targetRir: string | null | undefined;
}): RirLoadSuggestion | null {
  const load = parseNumber(currentLoad);
  const actual = parseNumber(actualRir);
  const target = parseRirTarget(targetRir);
  if (load === null || load <= 0 || actual === null || !target) return null;

  const distance = actual > target.max
    ? actual - target.max
    : actual < target.min
      ? actual - target.min
      : 0;
  const changePct = Math.max(-5, Math.min(5, distance * 2.5));
  let nextLoad = roundToHalfKg(load * (1 + changePct / 100));

  if (changePct > 0 && nextLoad <= load) nextLoad = load + 0.5;
  if (changePct < 0 && nextLoad >= load) nextLoad = Math.max(0.5, load - 0.5);

  const changeKg = Math.round((nextLoad - load) * 10) / 10;
  return {
    nextLoad,
    changeKg,
    changePct,
    direction: changeKg > 0 ? "increase" : changeKg < 0 ? "decrease" : "maintain",
    targetMin: target.min,
    targetMax: target.max,
  };
}

export function formatLoad(value: number) {
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(value);
}
