import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database.types";

export type PacienteComConsultas = Tables<"pacientes"> & {
  consultas_realizadas: number;
  consultas_agendadas: number;
};

export async function listPacientes(): Promise<PacienteComConsultas[]> {
  const supabase = await createClient();
  const [{ data, error }, { data: consultations }] = await Promise.all([
    supabase.from("pacientes").select("*").order("created_at", { ascending: false }),
    supabase.from("consultas").select("auth_id, status"),
  ]);

  if (error) throw new Error(`Erro ao carregar pacientes: ${error.message}`);
  return (data ?? []).map((patient) => ({
    ...patient,
    consultas_realizadas:
      patient.consultas_realizadas_iniciais
      + (consultations ?? []).filter((item) => item.auth_id === patient.auth_id && item.status === "realizada").length,
    consultas_agendadas: (consultations ?? []).filter(
      (item) => item.auth_id === patient.auth_id && item.status === "agendada",
    ).length,
  }));
}

export async function getPaciente(id: string): Promise<Tables<"pacientes"> | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("pacientes").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(`Erro ao carregar paciente: ${error.message}`);
  return data;
}

export async function getPacienteStats() {
  const supabase = await createClient();
  const [{ count: ativos }, { count: inativos }] = await Promise.all([
    supabase.from("pacientes").select("*", { count: "exact", head: true }).eq("status", "ativo"),
    supabase.from("pacientes").select("*", { count: "exact", head: true }).eq("status", "inativo"),
  ]);

  return { ativos: ativos ?? 0, inativos: inativos ?? 0 };
}
