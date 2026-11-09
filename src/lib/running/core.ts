import { z } from "zod";

export type RunningBlock = { id: string; nome: string; descricao: string; tipo: "caminhada" | "leve" | "recuperacao" | "controlado" | "prova"; segundos: number | null; pace_min: number | null; pace_max: number | null; adaptavel: boolean };
export type BlockResult = { bloco_id: string; segundos: number | null; distancia_km: number | null; comparavel: boolean };
export type TargetSnapshot = { bloco_id: string; pace_min: number | null; pace_max: number | null; ajuste: number };
export type RunningCycle = { id: string; paciente_id: string; mes: string; liberar_em: string; titulo: string; objetivo: string; orientacoes: string; ativo: boolean; pace_automatico?: boolean };
export type RunningWorkout = { id: string; ciclo_id: string; data_planejada: string; nome: string; aquecimento: string; principal: string; finalizacao: string; esforco: string; minutos_previstos: number | null; distancia_prevista: number | null; observacoes: string; ordem: number; blocos?: RunningBlock[] };
export type RunningRecord = { id: string; treino_id: string; paciente_id: string; data_realizada: string; concluido: boolean; duracao_seg: number | null; distancia_km: number | null; rpe: number | null; dor: number | null; sono_horas: number | null; fc_media: number | null; terreno: string; feedback: string; updated_at: string; resultados_blocos?: BlockResult[]; alvos_snapshot?: TargetSnapshot[] };
export type RunningData = { patientName: string; today: string; cycles: RunningCycle[]; workouts: RunningWorkout[]; records: RunningRecord[] };

export function brasilDate(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}
export function isReleased(release: string, today: string) { return release <= today; }
export function isCalendarDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}
export function durationSeconds(value: string): number | null {
  if (!value.trim()) return null;
  if (!/^\d{1,4}:[0-5]\d(?::[0-5]\d)?$/.test(value.trim())) throw new Error("Informe o tempo como minutos:segundos ou horas:minutos:segundos.");
  const parts = value.trim().split(":").map(Number);
  const seconds = parts.length === 2 ? parts[0] * 60 + parts[1] : parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (seconds <= 0 || seconds > 86400) throw new Error("O tempo deve ser maior que zero e de até 24 horas.");
  return seconds;
}
export function durationText(seconds: number | null) {
  if (seconds == null) return "";
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}
export function pace(seconds: number | null, km: number | null) {
  if (!(seconds && km && km > 0)) return "—";
  const perKm = Math.round(seconds / km);
  return `${Math.floor(perKm / 60)}:${String(perKm % 60).padStart(2, "0")}/km`;
}
const optionalNumber = (min: number, max: number, integer = false) => z.preprocess(v => {
  if (v === "" || v === null || v === undefined) return null;
  return typeof v === "string" ? Number(v.replace(",", ".")) : v;
}, (integer ? z.number().int() : z.number()).min(min).max(max).nullable());
export const recordInput = z.object({
  treinoId: z.string().uuid(), concluido: z.boolean(), data_realizada: z.string().refine(isCalendarDate, "Data inválida."),
  tempo: z.string().max(12), distancia_km: optionalNumber(0.01, 1000), rpe: optionalNumber(0, 10, true), dor: optionalNumber(0, 10, true),
  sono_horas: optionalNumber(0, 24), fc_media: optionalNumber(30, 250, true),
  terreno: z.enum(["", "Rua", "Esteira", "Pista", "Trilha"]), feedback: z.string().trim().max(3000),
  blocos: z.array(z.object({ bloco_id: z.string().min(1).max(80), tempo: z.string().max(12), distancia_km: optionalNumber(0.01, 100), comparavel: z.boolean() }).strict()).max(32).optional(),
}).strict();

const day = (date: string) => Date.parse(`${date}T12:00:00Z`) / 86400000;
/** Conservative product rule, not a physiological threshold model. Only comparable easy blocks qualify. */
export function adaptivePace(workouts: RunningWorkout[], records: RunningRecord[], today: string) {
  const index = new Map(workouts.map(w => [w.id, w]));
  const recent = records.filter(r => r.concluido && r.data_realizada <= today);
  const blocked = recent.some(r => {
    if (day(today) - day(r.data_realizada) > 7) return false;
    const planned = index.get(r.treino_id);
    const hardSession = planned?.blocos?.some(b => b.tipo === "controlado" || b.tipo === "prova");
    return (r.dor != null && r.dor > 0) || (r.rpe != null && (r.rpe >= 9 || (!!planned && !hardSession && r.rpe >= 5)));
  });
  if (blocked) return { seconds: 0, evidence: 0, blocked: true, history: [] as { date: string; seconds: number }[] };
  let seconds = 0;
  let batch: string[] = [];
  let lastChange = -Infinity;
  let lastRun = -Infinity;
  let lastTerrain = "";
  const history: { date: string; seconds: number }[] = [];
  const seen = new Set<string>();
  // A single date counts once, even with multiple blocks or duplicated activity entries.
  for (const r of [...recent].sort((a, b) => a.data_realizada.localeCompare(b.data_realizada))) {
    const w = index.get(r.treino_id);
    if (!w || seen.has(r.data_realizada) || r.rpe == null || r.rpe < 1 || r.rpe > 3 || r.dor !== 0 || r.sono_horas == null || r.sono_horas < 6 || !["Rua", "Pista", "Esteira"].includes(r.terreno)) continue;
    if (day(r.data_realizada) - lastRun > 14 && Number.isFinite(lastRun)) { seconds = 0; batch = []; lastChange = -Infinity; history.length = 0; }
    const qualifies = (r.resultados_blocos ?? []).some(result => {
      const b = w.blocos?.find(b => b.id === result.bloco_id);
      if (!b || b.tipo !== "leve" || !b.adaptavel || !b.pace_min || !result.comparavel || !result.segundos || result.segundos < 600 || !result.distancia_km || result.distancia_km < 1) return false;
      const p = result.segundos / result.distancia_km;
      // Reject implausible entries and require evidence faster than the current fast edge.
      return p >= b.pace_min * 0.8 && p <= b.pace_min - seconds - 10;
    });
    if (!qualifies) continue;
    seen.add(r.data_realizada);
    if (lastTerrain !== r.terreno) batch = [];
    lastTerrain = r.terreno;
    lastRun = day(r.data_realizada);
    batch = batch.filter(date => day(r.data_realizada) - day(date) <= 21);
    batch.push(r.data_realizada);
    if (batch.length >= 3 && day(batch.at(-1)!) - day(batch[0]) >= 7 && day(r.data_realizada) - lastChange >= 14 && seconds < 20) {
      seconds += 5; lastChange = day(r.data_realizada); history.push({ date: r.data_realizada, seconds }); batch = [];
    }
  }
  if (day(today) - lastRun > 14) return { seconds: 0, evidence: batch.length, blocked: false, history: [] as { date: string; seconds: number }[] };
  return { seconds, evidence: batch.length, blocked: false, history };
}
export function blockTargets(workout: RunningWorkout, record: RunningRecord | undefined, offset: number, today: string): TargetSnapshot[] {
  if (record?.concluido && record.alvos_snapshot?.length) return record.alvos_snapshot;
  return (workout.blocos ?? []).map(b => {
    const adjustment = !record?.concluido && workout.data_planejada >= today && b.adaptavel ? offset : 0;
    return { bloco_id: b.id, pace_min: b.pace_min == null ? null : b.pace_min - adjustment, pace_max: b.pace_max == null ? null : b.pace_max - adjustment, ajuste: adjustment };
  });
}
