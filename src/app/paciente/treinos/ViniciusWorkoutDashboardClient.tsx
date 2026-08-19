"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Check, Moon, Play, RotateCcw, Sun, Video } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { BRAND_LOGO_DATA_URI } from "@/lib/brand-logo";
import ViniciusEvolution from "./ViniciusEvolution";

type Workout = any;
type Exercise = any;
type Execution = any;
type ExerciseState = { sets: boolean[]; load: string; reps: string };
type RestState = { exerciseId: string; label: string; total: number; remaining: number; paused: boolean; endAt: number | null } | null;
type SessionState = { started: boolean; running: boolean; elapsedSec: number; timerAnchor: number | null; rest: RestState; obs: string };
type ProgressData = {
  activeWorkoutId?: string | null;
  exerciseState?: Record<string, ExerciseState>;
  sessions?: Record<string, SessionState>;
};

const EMPTY_SESSION: SessionState = { started: false, running: false, elapsedSec: 0, timerAnchor: null, rest: null, obs: "" };

function fmtTime(value: number) {
  const sec = Math.max(0, Math.floor(value || 0));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return h > 0
    ? `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
    : `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function getRepsNumber(value: string | null | undefined) {
  const match = String(value || "").match(/\d+/);
  return match ? Number(match[0]) : 0;
}

export default function ViniciusWorkoutDashboardClient({ patientId, patientName }: { patientId: string; patientName: string }) {
  const supabase = useMemo(() => createClient() as any, []);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [history, setHistory] = useState<Execution[]>([]);
  const [progress, setProgress] = useState<ProgressData>({ exerciseState: {}, sessions: {} });
  const [tab, setTab] = useState<"treino" | "evolucao">("treino");
  const [dark, setDark] = useState(true);
  const [clock, setClock] = useState(Date.now());
  const [saveState, setSaveState] = useState<"saved" | "saving" | "pending" | "error">("saved");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestProgress = useRef(progress);

  useEffect(() => { latestProgress.current = progress; }, [progress]);

  const activeWorkout = workouts.find((w) => w.id === progress.activeWorkoutId) || workouts[0] || null;
  const activeExercises = useMemo(() => {
    if (!activeWorkout) return [];
    return exercises
      .filter((e) => e.treino_id === activeWorkout.id)
      .sort((a, b) => (Number(a.bloco_ordem || 0) - Number(b.bloco_ordem || 0)) || (Number(a.ordem || 0) - Number(b.ordem || 0)));
  }, [activeWorkout, exercises]);

  const session = activeWorkout ? (progress.sessions?.[activeWorkout.id] || EMPTY_SESSION) : EMPTY_SESSION;

  const saveProgress = useCallback(async (data: ProgressData) => {
    setSaveState("saving");
    const { error: saveError } = await supabase.from("treino_progresso").upsert(
      { paciente_id: patientId, dados: data },
      { onConflict: "paciente_id" },
    );
    setSaveState(saveError ? "error" : "saved");
  }, [patientId, supabase]);

  const updateProgress = useCallback((updater: (current: ProgressData) => ProgressData) => {
    setProgress((current) => {
      const next = updater(current);
      latestProgress.current = next;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      setSaveState("pending");
      saveTimer.current = setTimeout(() => void saveProgress(latestProgress.current), 550);
      return next;
    });
  }, [saveProgress]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [{ data: workoutData, error: workoutError }, { data: progressRow }, { data: historyData }] = await Promise.all([
        supabase.from("treino_programas").select("*").eq("paciente_id", patientId).eq("status", "ativo").order("ordem"),
        supabase.from("treino_progresso").select("dados").eq("paciente_id", patientId).maybeSingle(),
        supabase.from("treino_execucoes").select("*").eq("paciente_id", patientId).eq("concluido", true).order("iniciado_em", { ascending: false }).limit(180),
      ]);
      if (workoutError) {
        setError("Não foi possível carregar seus treinos agora.");
        setLoading(false);
        return;
      }
      const ws = workoutData || [];
      const ids = ws.map((w: any) => w.id);
      const { data: exerciseData, error: exerciseError } = ids.length
        ? await supabase.from("treino_exercicios").select("*").in("treino_id", ids).order("bloco_ordem").order("ordem")
        : { data: [], error: null };
      if (exerciseError) {
        setError("Não foi possível carregar os exercícios agora.");
        setLoading(false);
        return;
      }
      const stored: ProgressData = progressRow?.dados || {};
      const validActive = ws.some((w: any) => w.id === stored.activeWorkoutId) ? stored.activeWorkoutId : ws[0]?.id || null;
      setWorkouts(ws);
      setExercises(exerciseData || []);
      setHistory(historyData || []);
      setProgress({ exerciseState: {}, sessions: {}, ...stored, activeWorkoutId: validActive });
      setLoading(false);
    }
    void load();
  }, [patientId, supabase]);

  useEffect(() => {
    const timer = setInterval(() => setClock(Date.now()), 500);
    const sync = () => setClock(Date.now());
    document.addEventListener("visibilitychange", sync);
    window.addEventListener("pageshow", sync);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", sync);
      window.removeEventListener("pageshow", sync);
    };
  }, []);

  useEffect(() => () => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
  }, []);

  const currentElapsed = useMemo(() => {
    if (!session.running || !session.timerAnchor) return session.elapsedSec || 0;
    return (session.elapsedSec || 0) + Math.max(0, Math.floor((clock - session.timerAnchor) / 1000));
  }, [clock, session.elapsedSec, session.running, session.timerAnchor]);

  const currentRest = useMemo(() => {
    const r = session.rest;
    if (!r) return null;
    if (r.paused || !r.endAt) return r;
    return { ...r, remaining: Math.max(0, Math.ceil((r.endAt - clock) / 1000)) };
  }, [clock, session.rest]);

  useEffect(() => {
    if (!activeWorkout || !session.rest || session.rest.paused || !session.rest.endAt) return;
    if (session.rest.endAt > clock) return;
    updateProgress((p) => ({
      ...p,
      sessions: { ...p.sessions, [activeWorkout.id]: { ...(p.sessions?.[activeWorkout.id] || EMPTY_SESSION), rest: null } },
    }));
  }, [activeWorkout, clock, session.rest, updateProgress]);

  function getExerciseState(ex: Exercise): ExerciseState {
    const raw = progress.exerciseState?.[ex.id];
    const count = Math.max(0, Number(ex.series || 0));
    const sets = Array.isArray(raw?.sets) ? raw.sets.slice(0, count) : [];
    while (sets.length < count) sets.push(false);
    return { sets, load: raw?.load ?? "", reps: raw?.reps ?? "" };
  }

  function setSession(patch: Partial<SessionState>) {
    if (!activeWorkout) return;
    updateProgress((p) => ({
      ...p,
      sessions: {
        ...p.sessions,
        [activeWorkout.id]: { ...(p.sessions?.[activeWorkout.id] || EMPTY_SESSION), ...patch },
      },
    }));
  }

  function toggleWorkoutTimer() {
    if (!session.started) {
      setSession({ started: true, running: true, elapsedSec: 0, timerAnchor: Date.now() });
      return;
    }
    if (session.running) setSession({ running: false, elapsedSec: currentElapsed, timerAnchor: null });
    else setSession({ running: true, timerAnchor: Date.now() });
  }

  function startRest(ex: Exercise) {
    const sec = Math.max(0, Number(ex.descanso_seg || 0));
    if (!sec) return;
    setSession({ rest: { exerciseId: ex.id, label: ex.nome, total: sec, remaining: sec, paused: false, endAt: Date.now() + sec * 1000 } });
  }

  function toggleSet(ex: Exercise, index: number) {
    const state = getExerciseState(ex);
    const nextSets = [...state.sets];
    nextSets[index] = !nextSets[index];
    updateProgress((p) => ({ ...p, exerciseState: { ...p.exerciseState, [ex.id]: { ...state, sets: nextSets } } }));
    if (nextSets[index]) startRest(ex);
    if (!session.started) setSession({ started: true, running: true, timerAnchor: Date.now() });
  }

  function toggleAll(ex: Exercise) {
    const state = getExerciseState(ex);
    const mark = !state.sets.every(Boolean);
    updateProgress((p) => ({ ...p, exerciseState: { ...p.exerciseState, [ex.id]: { ...state, sets: state.sets.map(() => mark) } } }));
    if (mark) startRest(ex);
  }

  function setExerciseField(ex: Exercise, key: "load" | "reps", value: string) {
    const state = getExerciseState(ex);
    updateProgress((p) => ({ ...p, exerciseState: { ...p.exerciseState, [ex.id]: { ...state, [key]: value } } }));
  }

  const completion = useMemo(() => {
    let total = 0, done = 0, doneExercises = 0;
    for (const ex of activeExercises) {
      const st = getExerciseState(ex);
      total += st.sets.length;
      done += st.sets.filter(Boolean).length;
      if (st.sets.length && st.sets.every(Boolean)) doneExercises++;
    }
    return { total, done, doneExercises, pct: total ? Math.round(done / total * 100) : 0 };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeExercises, progress.exerciseState]);

  async function finishWorkout() {
    if (!activeWorkout) return;
    if (completion.done < completion.total && !window.confirm("Ainda existem séries não marcadas. Deseja concluir mesmo assim?")) return;
    const duration = Math.max(1, currentElapsed || 1);
    let volume = 0;
    const snapshot = activeExercises.map((ex) => {
      const st = getExerciseState(ex);
      const doneSets = st.sets.filter(Boolean).length;
      const load = Number(String(st.load).replace(",", ".")) || 0;
      const reps = Number(st.reps) || getRepsNumber(ex.repeticoes);
      volume += doneSets * load * reps;
      return { id: ex.id, name: ex.nome, doneSets, sets: st.sets, load, reps, restSec: ex.descanso_seg || 0 };
    });
    const now = new Date();
    const payload = {
      paciente_id: patientId,
      treino_id: activeWorkout.id,
      iniciado_em: new Date(now.getTime() - duration * 1000).toISOString(),
      finalizado_em: now.toISOString(),
      duracao_seg: duration,
      concluido: true,
      observacoes: session.obs || "",
      dados: { workoutName: activeWorkout.nome, workoutCode: activeWorkout.codigo || "", volume: Math.round(volume), exercises: snapshot },
    };
    const { data, error: insertError } = await supabase.from("treino_execucoes").insert(payload).select("*").single();
    if (insertError) {
      window.alert("Não foi possível registrar a conclusão agora.");
      return;
    }
    if (data) setHistory((h) => [data, ...h]);
    const cleared = { ...progress.exerciseState };
    for (const ex of activeExercises) {
      const st = getExerciseState(ex);
      cleared[ex.id] = { ...st, sets: st.sets.map(() => false) };
    }
    const next: ProgressData = {
      ...progress,
      exerciseState: cleared,
      sessions: { ...progress.sessions, [activeWorkout.id]: { ...EMPTY_SESSION } },
    };
    setProgress(next);
    latestProgress.current = next;
    await saveProgress(next);
    setTab("evolucao");
  }

  if (loading) return <main className="min-h-screen bg-[#0E1A14] px-4 py-20 text-center text-[#9DB3A7]">Carregando seu dashboard de treino…</main>;
  if (error) return <main className="min-h-screen bg-[#0E1A14] px-4 py-10 text-white"><div className="mx-auto max-w-3xl rounded-3xl border border-white/10 bg-white/5 p-6">{error}</div></main>;
  if (!activeWorkout) return <main className="min-h-screen bg-[#0E1A14] px-4 py-10 text-white"><div className="mx-auto max-w-3xl rounded-3xl border border-white/10 bg-white/5 p-6">Nenhum treino ativo liberado no momento.</div></main>;

  const grouped = new Map<string, Exercise[]>();
  for (const ex of activeExercises) {
    const key = `${ex.bloco_ordem || 0}:${ex.bloco_nome || "Exercícios"}`;
    grouped.set(key, [...(grouped.get(key) || []), ex]);
  }

  return (
    <main className={dark ? "min-h-screen bg-[#0E1A14] text-[#F5FFF9]" : "min-h-screen bg-[#F4F6F4] text-[#102019]"}>
      <div className="mx-auto max-w-[1040px] px-3 pb-28 pt-4 sm:px-4">
        <header className="mb-4 flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <Link href="/paciente" className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border border-current/15 px-3 text-xs font-black"><ArrowLeft className="size-4" /> Área do paciente</Link>
            <Image src={BRAND_LOGO_DATA_URI} alt="Nutri Thales Rosa" width={130} height={44} className="hidden h-auto w-[120px] object-contain sm:block" unoptimized priority />
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setDark((v) => !v)} className="grid size-11 place-items-center rounded-full border border-current/15" aria-label="Alternar tema">{dark ? <Sun className="size-4" /> : <Moon className="size-4" />}</button>
            <span className="grid size-11 place-items-center rounded-full bg-[#19DD7F] font-black text-[#04120B]">{patientName.trim().charAt(0).toUpperCase()}</span>
          </div>
        </header>

        <nav className="mb-5 flex gap-2 overflow-x-auto pb-1">
          <button onClick={() => setTab("treino")} className={`rounded-full px-4 py-2.5 text-sm font-black ${tab === "treino" ? "bg-[#19DD7F] text-[#04120B]" : "border border-current/15"}`}>Treino</button>
          <button onClick={() => setTab("evolucao")} className={`rounded-full px-4 py-2.5 text-sm font-black ${tab === "evolucao" ? "bg-[#19DD7F] text-[#04120B]" : "border border-current/15"}`}>Evolução</button>
        </nav>

        {tab === "treino" ? (
          <>
            <section className={`mb-4 rounded-[26px] border p-5 shadow-2xl ${dark ? "border-[#294337] bg-[#15251D]" : "border-black/10 bg-white"}`}>
              <p className="text-[11px] font-black uppercase tracking-[.14em] text-[#19DD7F]">Treino de hoje</p>
              <h1 className="mt-1 text-3xl font-black tracking-tight sm:text-4xl">{activeWorkout.nome}</h1>
              <p className="mt-2 text-sm opacity-65">{activeWorkout.objetivo || "Marque cada série, acompanhe o descanso e registre sua evolução."}</p>
              <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[.12em] opacity-55">Cronômetro do treino</p>
                  <p className="mt-1 text-3xl font-black tabular-nums">{fmtTime(currentElapsed)}</p>
                  <p className={`mt-1 text-xs ${saveState === "error" ? "text-red-400" : "opacity-55"}`}>{saveState === "saving" ? "Salvando…" : saveState === "pending" ? "Alterações pendentes" : saveState === "error" ? "Erro ao salvar" : "Salvo automaticamente"}</p>
                </div>
                <button onClick={toggleWorkoutTimer} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#19DD7F] px-4 text-sm font-black text-[#04120B]"><Play className="size-4" /> {!session.started ? "Iniciar treino" : session.running ? "Pausar" : "Retomar"}</button>
              </div>
            </section>

            <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
              {workouts.map((w) => <button key={w.id} onClick={() => updateProgress((p) => ({ ...p, activeWorkoutId: w.id }))} className={`whitespace-nowrap rounded-full px-4 py-2.5 text-sm font-black ${w.id === activeWorkout.id ? "bg-[#19DD7F] text-[#04120B]" : "border border-current/15"}`}>{w.nome}</button>)}
            </div>

            <section className={`mb-5 grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-2xl border p-4 ${dark ? "border-[#294337] bg-[#15251D]" : "border-black/10 bg-white"}`}>
              <b className="text-2xl">{completion.pct}%</b>
              <div className={`h-2 overflow-hidden rounded-full ${dark ? "bg-[#243C30]" : "bg-black/10"}`}><div className="h-full rounded-full bg-[#19DD7F]" style={{ width: `${completion.pct}%` }} /></div>
              <span className="text-[11px] opacity-60">{completion.done}/{completion.total} séries</span>
            </section>

            {[...grouped.values()].map((group, gi) => (
              <section key={gi} className="mb-6">
                <h2 className="mb-3 text-lg font-black">{group[0]?.bloco_nome || "Exercícios"}</h2>
                <div className="grid gap-3">
                  {group.map((ex) => {
                    const st = getExerciseState(ex);
                    const allDone = st.sets.length > 0 && st.sets.every(Boolean);
                    return <article key={ex.id} className={`overflow-hidden rounded-[20px] border ${allDone ? "border-[#19DD7F]" : dark ? "border-[#294337]" : "border-black/10"} ${dark ? "bg-[#15251D]" : "bg-white"}`}>
                      <div className="flex items-start justify-between gap-3 p-4">
                        <div>
                          <h3 className="text-lg font-black">{ex.nome}</h3>
                          <p className="mt-1 text-xs opacity-60">{Number(ex.series || 0)} séries · {ex.repeticoes || "repetições livres"}{ex.descanso_seg ? ` · ${ex.descanso_seg}s descanso` : ""}</p>
                        </div>
                        <button onClick={() => toggleAll(ex)} className={`grid size-11 shrink-0 place-items-center rounded-full border-2 ${allDone ? "border-[#19DD7F] bg-[#19DD7F] text-[#04120B]" : "border-current/20"}`}>{allDone ? <Check className="size-5" /> : null}</button>
                      </div>
                      <div className="px-4 pb-4">
                        <div className="mb-3 flex flex-wrap gap-2">{st.sets.map((done, i) => <button key={i} onClick={() => toggleSet(ex, i)} className={`size-11 rounded-xl border font-black ${done ? "border-[#19DD7F] bg-[#19DD7F] text-[#04120B]" : "border-current/20"}`}>{i + 1}</button>)}</div>
                        <div className="grid grid-cols-2 gap-2">
                          <label className="text-[10px] font-black uppercase tracking-[.08em] opacity-60">Carga<input value={st.load} onChange={(e) => setExerciseField(ex, "load", e.target.value)} inputMode="decimal" className={`mt-1 w-full rounded-xl border px-3 py-2.5 text-sm outline-none ${dark ? "border-[#294337] bg-[#1B2F25]" : "border-black/10 bg-[#F4F6F4]"}`} placeholder={ex.carga_inicial ? `${ex.carga_inicial} kg` : "kg"} /></label>
                          <label className="text-[10px] font-black uppercase tracking-[.08em] opacity-60">Repetições realizadas<input value={st.reps} onChange={(e) => setExerciseField(ex, "reps", e.target.value)} inputMode="numeric" className={`mt-1 w-full rounded-xl border px-3 py-2.5 text-sm outline-none ${dark ? "border-[#294337] bg-[#1B2F25]" : "border-black/10 bg-[#F4F6F4]"}`} placeholder={ex.repeticoes || "reps"} /></label>
                        </div>
                        {ex.observacoes ? <p className="mt-3 whitespace-pre-line text-xs leading-5 opacity-65">{ex.observacoes}</p> : null}
                        {ex.video_url ? <a href={ex.video_url} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-2 text-xs font-black text-[#19DD7F]"><Video className="size-4" /> Ver execução</a> : null}
                      </div>
                    </article>;
                  })}
                </div>
              </section>
            ))}

            <section className={`mb-3 rounded-2xl border p-4 ${dark ? "border-[#294337] bg-[#15251D]" : "border-black/10 bg-white"}`}>
              <label className="text-[10px] font-black uppercase tracking-[.08em] opacity-60">Observações do treino<textarea rows={4} value={session.obs || ""} onChange={(e) => setSession({ obs: e.target.value })} className={`mt-2 w-full resize-none rounded-xl border p-3 text-sm outline-none ${dark ? "border-[#294337] bg-[#1B2F25]" : "border-black/10 bg-[#F4F6F4]"}`} /></label>
            </section>
            <div className="flex flex-wrap gap-2">
              <button onClick={finishWorkout} className="min-h-11 rounded-xl bg-[#19DD7F] px-4 text-sm font-black text-[#04120B]">Concluir treino</button>
              <button onClick={() => setSession({ started: true, running: true, elapsedSec: 0, timerAnchor: Date.now(), rest: null })} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-current/15 px-4 text-sm font-black"><RotateCcw className="size-4" /> Reiniciar cronômetro</button>
            </div>
          </>
        ) : (
          <ViniciusEvolution history={history} workouts={workouts} dark={dark} />
        )}
      </div>

      {currentRest ? (
        <div className={`fixed bottom-4 left-1/2 z-50 w-[min(430px,calc(100vw-28px))] -translate-x-1/2 rounded-2xl border p-4 shadow-2xl ${dark ? "border-[#294337] bg-[#15251D]" : "border-black/10 bg-white"}`}>
          <div className="flex items-end justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[.08em] opacity-55">Descanso · {currentRest.label}</p><b className="text-2xl tabular-nums">{fmtTime(currentRest.remaining)}</b></div></div>
          <div className={`my-2 h-2 overflow-hidden rounded-full ${dark ? "bg-[#243C30]" : "bg-black/10"}`}><div className="h-full rounded-full bg-[#19DD7F]" style={{ width: `${currentRest.total ? Math.max(0, Math.min(100, currentRest.remaining / currentRest.total * 100)) : 0}%` }} /></div>
          <div className="grid grid-cols-4 gap-1.5 text-[11px] font-black">
            <button onClick={() => setSession({ rest: currentRest.paused ? { ...currentRest, paused: false, endAt: Date.now() + currentRest.remaining * 1000 } : { ...currentRest, remaining: currentRest.endAt ? Math.max(0, Math.ceil((currentRest.endAt - Date.now()) / 1000)) : currentRest.remaining, paused: true, endAt: null } })} className="rounded-lg border border-current/15 py-2">{currentRest.paused ? "Retomar" : "Pausar"}</button>
            <button onClick={() => setSession({ rest: { ...currentRest, remaining: currentRest.total, paused: false, endAt: Date.now() + currentRest.total * 1000 } })} className="rounded-lg border border-current/15 py-2">Reiniciar</button>
            <button onClick={() => setSession({ rest: { ...currentRest, total: currentRest.total + 30, remaining: currentRest.remaining + 30, endAt: currentRest.paused ? null : Date.now() + (currentRest.remaining + 30) * 1000 } })} className="rounded-lg border border-current/15 py-2">+30s</button>
            <button onClick={() => setSession({ rest: null })} className="rounded-lg border border-current/15 py-2">Pular</button>
          </div>
        </div>
      ) : null}
    </main>
  );
}
