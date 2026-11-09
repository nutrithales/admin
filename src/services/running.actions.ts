"use server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { brasilDate, durationSeconds, recordInput, type RunningRecord } from "@/lib/running/core";

export async function saveRunningRecord(input: unknown): Promise<{ success: true; record: RunningRecord } | { success: false; message: string }> {
  const parsed = recordInput.safeParse(input);
  if (!parsed.success) return { success: false, message: "Confira a data e os campos numéricos. Esforço e dor vão de 0 a 10; o feedback aceita até 3.000 caracteres." };
  const { treinoId, tempo, ...fields } = parsed.data;
  if (fields.data_realizada > brasilDate()) return { success: false, message: "A data realizada não pode estar no futuro." };
  let seconds: number | null;
  try { seconds = durationSeconds(tempo); } catch (e) { return { success: false, message: e instanceof Error ? e.message : "Tempo inválido." }; }
  const sb = await createClient() as unknown as SupabaseClient;
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { success: false, message: "Sua sessão expirou. Entre novamente." };
  const { data: patient, error: pError } = await sb.from("pacientes").select("id").eq("auth_id", user.id).maybeSingle();
  if (pError || !patient) return { success: false, message: "Cadastro não encontrado." };
  const { data: workout, error: wError } = await sb.from("corrida_treinos").select("id,ciclo_id").eq("id", treinoId).maybeSingle();
  if (wError || !workout) return { success: false, message: "Este treino ainda não está liberado ou não pertence ao seu plano." };
  const { data: cycle } = await sb.from("corrida_ciclos").select("paciente_id,liberar_em,ativo").eq("id", workout.ciclo_id).maybeSingle();
  if (!cycle?.ativo || cycle.paciente_id !== patient.id || cycle.liberar_em > brasilDate()) return { success: false, message: "Este treino ainda não está liberado." };
  const { data, error } = await sb.from("corrida_registros").upsert({ ...fields, treino_id: treinoId, paciente_id: patient.id, duracao_seg: seconds, updated_at: new Date().toISOString() }, { onConflict: "treino_id" }).select("*").single();
  if (error || !data) return { success: false, message: "Não foi possível salvar. Seus dados continuam na tela; tente novamente." };
  revalidatePath("/paciente/corrida");
  revalidatePath(`/pacientes/${patient.id}/corrida`);
  return { success: true, record: data as RunningRecord };
}
