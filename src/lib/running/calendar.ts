import type { RunningData, RunningWorkout, TargetSnapshot } from "./core";

export type CalendarEntry = { id: string; date: string; title: string; description: string; warning?: string };
const mmss = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
const text = (value: string) => value.replace(/[\r\n]+/g, " ").trim();

/** Explicit /km units avoid depending on the athlete's Intervals.icu unit preferences. */
export function workoutDescription(w: RunningWorkout, targets: TargetSnapshot[]) {
  const blocks = w.blocos ?? [];
  if (!blocks.length) throw new Error("Treino sem blocos estruturados.");
  const mixedRace = blocks.some(b => b.id === "corrida-prova") && !!w.distancia_prevista;
  const distanceBlocks = blocks.filter(b => b.tipo === "prova" && b.segundos == null);
  const distances = new Map(distanceBlocks.map(b => {
    const match = /^Km (\d+)(?:[–-](\d+))?$/.exec(b.nome);
    return [b.id, match ? Number(match[2] ?? match[1]) - Number(match[1]) + 1 : NaN];
  }));
  if (distanceBlocks.length && (!w.distancia_prevista || [...distances.values()].some(n => !Number.isFinite(n) || n <= 0) || [...distances.values()].reduce((a, b) => a + b, 0) !== Number(w.distancia_prevista))) throw new Error("Confira as distâncias dos blocos antes de exportar.");
  const lines: string[] = [];
  for (const b of blocks) {
    if (mixedRace && b.id === "caminhada-prova") continue;
    const label = b.id === "aquecimento" ? "Warmup / Aquecimento" : b.id === "finalizacao" ? "Cooldown / Finalização" : text(b.nome);
    if (mixedRace && b.id === "corrida-prova") {
      // Do not invent repetitions or apply a running pace to the run/walk average.
      lines.push(`Prova: seguir a estratégia de corrida/caminhada descrita abaixo\n- ${w.distancia_prevista}km`);
      continue;
    }
    if (!(b.segundos && b.segundos > 0) && !distances.has(b.id)) throw new Error("Bloco sem duração ou distância definida.");
    const duration = b.segundos ? `${b.segundos}s` : `${distances.get(b.id)}km`;
    const target = targets.find(t => t.bloco_id === b.id);
    if (!target?.pace_min || !target.pace_max || target.pace_min < 120 || target.pace_max < target.pace_min || target.pace_max > 3600) throw new Error("Bloco sem faixa de pace válida.");
    lines.push(`${label}\n- ${duration} ${mmss(target.pace_max)}-${mmss(target.pace_min)}/km Pace`);
  }
  const warning = mixedRace ? "Prova corrida/caminhada: o relógio recebe a distância total e a estratégia em texto. Para avisos de 4 min correndo / 1 min caminhando, configurar os intervalos no relógio; não é uma sequência automática de repetições neste calendário." : undefined;
  const notes = blocks.map(b => { const target = targets.find(t => t.bloco_id === b.id); return `${text(b.nome)}: ${text(b.descricao)}${target?.pace_min && target.pace_max ? ` Pace alvo ${mmss(target.pace_min)}-${mmss(target.pace_max)}/km.` : ""}`; }).join("\n");
  return { description: `${lines.join("\n\n")}\n\nOrientações do treinador\n${notes}\n${text(w.observacoes ?? "")}${warning ? `\n${warning}` : ""}`, warning };
}

export function calendarEntries(data: RunningData, targetsFor: (w: RunningWorkout) => TargetSnapshot[]) {
  const allowed = new Set(data.cycles.filter(c => c.ativo && c.liberar_em <= data.today).map(c => c.id));
  return data.workouts.filter(w => allowed.has(w.ciclo_id)).map(w => ({ id: w.id, date: w.data_planejada, title: `Run - ${text(w.nome)}`, ...workoutDescription(w, targetsFor(w)) }));
}

export const escapeIcs = (value: string) => value.replace(/\\/g, "\\\\").replace(/\r\n|\r|\n/g, "\\n").replace(/;/g, "\\;").replace(/,/g, "\\,");
/** RFC 5545 folding is in UTF-8 octets, not JavaScript string length. */
export function foldIcs(line: string) {
  const lines: string[] = []; let current = ""; let bytes = 0;
  for (const char of line) {
    const size = new TextEncoder().encode(char).length;
    if (bytes + size > 75) { lines.push(current); current = " "; bytes = 1; }
    current += char; bytes += size;
  }
  lines.push(current); return lines.join("\r\n");
}
export function renderCalendar(entries: CalendarEntry[], revision: number, modifiedAt: string) {
  const stamp = new Date(modifiedAt).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Nutri Thales//Corrida//PT-BR", "CALSCALE:GREGORIAN", "METHOD:PUBLISH", "X-WR-CALNAME:Corrida Nutri Thales"];
  for (const e of [...entries].sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id))) {
    if (!/^[\w-]+$/.test(e.id) || !/^\d{4}-\d{2}-\d{2}$/.test(e.date)) throw new Error("Evento inválido.");
    const next = new Date(`${e.date}T12:00:00Z`); next.setUTCDate(next.getUTCDate() + 1);
    lines.push("BEGIN:VEVENT", `UID:corrida-${e.id}@nutrithales.com.br`, `DTSTAMP:${stamp}`, `LAST-MODIFIED:${stamp}`, `SEQUENCE:${revision}`, `DTSTART;VALUE=DATE:${e.date.replace(/-/g, "")}`, `DTEND;VALUE=DATE:${next.toISOString().slice(0, 10).replace(/-/g, "")}`, `SUMMARY:${escapeIcs(e.title)}`, "CATEGORIES:Run", `DESCRIPTION:${escapeIcs(e.description)}`, "STATUS:CONFIRMED", "TRANSP:TRANSPARENT", "END:VEVENT");
  }
  lines.push("END:VCALENDAR"); return lines.map(foldIcs).join("\r\n") + "\r\n";
}
