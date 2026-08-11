import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database.types";
import { computeConsultasStats } from "@/lib/clara/consultas";

export type FluxoPaciente = Tables<"pacientes"> & {
  consultas_realizadas: number;
  consultas_agendadas: number;
  modalidade: string | null;
  proxima_consulta: string | null;
};

export async function listFluxoPacientes(): Promise<FluxoPaciente[]> {
  const supabase = await createClient();
  const [{ data: patients, error }, { data: consultations }] = await Promise.all([
    supabase.from("pacientes").select("*").order("fluxo_updated_at", { ascending: false }),
    supabase.from("consultas").select("auth_id, data, status, modalidade").order("data", { ascending: false }),
  ]);

  if (error) throw new Error(`Erro ao carregar o fluxo: ${error.message}`);
  const now = Date.now();

  return (patients ?? []).map((patient) => {
    const own = (consultations ?? []).filter((item) => item.auth_id === patient.auth_id);
    const next = own
      .filter(
        (item) => (item.status === "agendada" || item.status === "confirmada") && item.data && +new Date(item.data) >= now,
      )
      .sort((a, b) => +new Date(a.data ?? 0) - +new Date(b.data ?? 0))[0];
    const latest = own[0];
    const stats = computeConsultasStats(patient, own);
    return {
      ...patient,
      consultas_realizadas: stats.realizadas,
      consultas_agendadas: stats.agendadas,
      modalidade: next?.modalidade ?? latest?.modalidade ?? null,
      proxima_consulta: next?.data ?? null,
    };
  });
}

export async function listHistoricoFluxo(pacienteId: string): Promise<Tables<"fluxo_movimentacoes">[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("fluxo_movimentacoes")
    .select("*")
    .eq("paciente_id", pacienteId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Erro ao carregar histórico do Fluxo: ${error.message}`);
  return data ?? [];
}
