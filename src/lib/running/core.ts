import { z } from "zod";

export type RunningCycle = { id: string; paciente_id: string; mes: string; liberar_em: string; titulo: string; objetivo: string; orientacoes: string; ativo: boolean };
export type RunningWorkout = { id: string; ciclo_id: string; data_planejada: string; nome: string; aquecimento: string; principal: string; finalizacao: string; esforco: string; minutos_previstos: number | null; distancia_prevista: number | null; observacoes: string; ordem: number };
export type RunningRecord = { id: string; treino_id: string; paciente_id: string; data_realizada: string; concluido: boolean; duracao_seg: number | null; distancia_km: number | null; rpe: number | null; dor: number | null; sono_horas: number | null; fc_media: number | null; terreno: string; feedback: string; updated_at: string };
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
}).strict();
