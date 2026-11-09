"use server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { adaptivePace, blockTargets, brasilDate, durationSeconds, recordInput, type RunningRecord, type RunningWorkout, type BlockResult } from "@/lib/running/core";
import { getRunningData } from "./running.queries";

export async function saveRunningRecord(input: unknown): Promise<{ success: true; record: RunningRecord } | { success: false; message: string }> {
  const parsed = recordInput.safeParse(input);
  if (!parsed.success) return { success: false, message: "Confira a data e os campos numéricos. Esforço e dor vão de 0 a 10; o feedback aceita até 3.000 caracteres." };
  const { treinoId, tempo, blocos, ...fields } = parsed.data;
  if (fields.data_realizada > brasilDate()) return { success: false, message: "A data realizada não pode estar no futuro." };
  let seconds: number | null;
  try { seconds = durationSeconds(tempo); } catch (e) { return { success: false, message: e instanceof Error ? e.message : "Tempo inválido." }; }
  const sb = await createClient() as unknown as SupabaseClient;
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { success: false, message: "Sua sessão expirou. Entre novamente." };
  const { data: patient, error: pError } = await sb.from("pacientes").select("id").eq("auth_id", user.id).maybeSingle();
  if (pError || !patient) return { success: false, message: "Cadastro não encontrado." };
  const { data: workout, error: wError } = await sb.from("corrida_treinos").select("*").eq("id", treinoId).maybeSingle();
  if (wError || !workout) return { success: false, message: "Este treino ainda não está liberado ou não pertence ao seu plano." };
  const { data: cycle } = await sb.from("corrida_ciclos").select("paciente_id,liberar_em,ativo").eq("id", workout.ciclo_id).maybeSingle();
  if (!cycle?.ativo || cycle.paciente_id !== patient.id || cycle.liberar_em > brasilDate()) return { success: false, message: "Este treino ainda não está liberado." };
  const running = await getRunningData();
  if (!running) return { success: false, message: "Não foi possível carregar seus ritmos." };
  const previous = running.records.find(r => r.treino_id === treinoId);
  let results: BlockResult[] = previous?.resultados_blocos ?? [];
  if (blocos) {
    const ids = new Set<string>();
    results = [];
    for (const b of blocos) {
      if (ids.has(b.bloco_id) || !(workout.blocos ?? []).some((p: { id: string }) => p.id === b.bloco_id)) return { success: false, message: "Bloco inválido. Recarregue a página." };
      ids.add(b.bloco_id);
      let duration: number | null;
      try { duration = durationSeconds(b.tempo); } catch { return { success: false, message: "Confira o tempo dos blocos (min:seg)." }; }
      if ((duration == null) !== (b.distancia_km == null) || (b.comparavel && !duration)) return { success: false, message: "Para registrar um bloco, preencha tempo e distância juntos." };
      results.push({ bloco_id: b.bloco_id, segundos: duration, distancia_km: b.distancia_km, comparavel: b.comparavel });
    }
    if (seconds && results.reduce((sum, r) => sum + (r.segundos ?? 0), 0) > seconds + 5) return { success: false, message: "A soma dos tempos dos blocos não pode ultrapassar o tempo total." };
  }
  const eligible = running.workouts.filter(w => running.cycles.some(c => c.id === w.ciclo_id && c.pace_automatico));
  const offset = running.cycles.find(c => c.id === workout.ciclo_id)?.pace_automatico ? adaptivePace(eligible, running.records, running.today).seconds : 0;
  const snapshot = previous?.concluido && previous.alvos_snapshot?.length ? previous.alvos_snapshot : blockTargets(workout as RunningWorkout, undefined, offset, running.today);
  const { data, error } = await sb.from("corrida_registros").upsert({ ...fields, treino_id: treinoId, paciente_id: patient.id, duracao_seg: seconds, resultados_blocos: results, alvos_snapshot: snapshot, updated_at: new Date().toISOString() }, { onConflict: "treino_id" }).select("*").single();
  if (error || !data) return { success: false, message: "Não foi possível salvar. Seus dados continuam na tela; tente novamente." };
  revalidatePath("/paciente/corrida");
  revalidatePath(`/pacientes/${patient.id}/corrida`);
  return { success: true, record: data as RunningRecord };
}
