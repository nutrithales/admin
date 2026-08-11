import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database.types";

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
      .filter((item) => item.status === "agendada" && item.data && +new Date(item.data) >= now)
      .sort((a, b) => +new Date(a.data ?? 0) - +new Date(b.data ?? 0))[0];
    const latest = own[0];
    return {
      ...patient,
      consultas_realizadas: patient.consultas_realizadas_iniciais + own.filter((item) => item.status === "realizada").length,
      consultas_agendadas: own.filter((item) => item.status === "agendada").length,
      modalidade: next?.modalidade ?? latest?.modalidade ?? null,
      proxima_consulta: next?.data ?? null,
    };
  });
}
