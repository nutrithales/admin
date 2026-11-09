import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { assertAdmin } from "@/lib/supabase/assert-admin";
import { brasilDate, type RunningCycle, type RunningData, type RunningRecord, type RunningWorkout } from "@/lib/running/core";

export async function getRunningData(adminPatientId?: string): Promise<RunningData | null> {
  if (adminPatientId) await assertAdmin();
  const sb = await createClient() as unknown as SupabaseClient;
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return null;
  const query = sb.from("pacientes").select("id,nome");
  const { data: patient, error: patientError } = await (adminPatientId ? query.eq("id", adminPatientId) : query.eq("auth_id", user.id)).maybeSingle();
  if (patientError) throw new Error("Não foi possível carregar o cadastro.");
  if (!patient) return null;
  const [{ data: cycles, error: cError }, { data: records, error: rError }] = await Promise.all([
    sb.from("corrida_ciclos").select("id,paciente_id,mes,liberar_em,titulo,objetivo,orientacoes,ativo").eq("paciente_id", patient.id).eq("ativo", true).order("mes"),
    sb.from("corrida_registros").select("*").eq("paciente_id", patient.id).order("data_realizada", { ascending: false }),
  ]);
  if (cError || rError) throw new Error("Não foi possível carregar as corridas. Tente novamente.");
  const ids = (cycles ?? []).map(c => c.id);
  const { data: workouts, error: wError } = ids.length ? await sb.from("corrida_treinos").select("*").in("ciclo_id", ids).order("data_planejada").order("ordem") : { data: [], error: null };
  if (wError) throw new Error("Não foi possível carregar os treinos.");
  return { patientName: patient.nome, today: brasilDate(), cycles: (cycles ?? []) as RunningCycle[], workouts: (workouts ?? []) as RunningWorkout[], records: (records ?? []) as RunningRecord[] };
}
