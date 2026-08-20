import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database.types";
import { computeConsultasStats } from "@/lib/clara/consultas";

export interface PacientePlanoParalelo {
  id: string;
  paciente_id: string;
  categoria: string;
  nome: string;
  data_inicio: string;
  data_fim: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface PacientePlanosSelect {
  select: (columns: string) => {
    eq: (column: string, value: string) => {
      order: (column: string, options: { ascending: boolean }) => Promise<{ data: PacientePlanoParalelo[] | null }>;
    };
  };
}

export type PacienteComConsultas = Tables<"pacientes"> & {
  consultas_realizadas: number;
  consultas_agendadas: number;
  planos_paralelos: PacientePlanoParalelo[];
};

export async function listPacientes(): Promise<PacienteComConsultas[]> {
  const supabase = await createClient();
  const pacientePlanos = (supabase as unknown as { from: (table: string) => PacientePlanosSelect }).from("paciente_planos");
  const [{ data, error }, { data: consultations }, { data: planosParalelos }] = await Promise.all([
    supabase.from("pacientes").select("*").order("created_at", { ascending: false }),
    supabase.from("consultas").select("auth_id, status"),
    pacientePlanos.select("*").eq("status", "ativo").order("data_fim", { ascending: false }),
  ]);

  if (error) throw new Error(`Erro ao carregar pacientes: ${error.message}`);
  return (data ?? []).map((patient) => {
    const consultasDoPaciente = (consultations ?? []).filter((item) => item.auth_id === patient.auth_id);
    const stats = computeConsultasStats(patient, consultasDoPaciente);
    return {
      ...patient,
      consultas_realizadas: stats.realizadas,
      consultas_agendadas: stats.agendadas,
      planos_paralelos: (planosParalelos ?? []).filter((plano) => plano.paciente_id === patient.id),
    };
  });
}

export async function getPaciente(id: string): Promise<Tables<"pacientes"> | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("pacientes").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(`Erro ao carregar paciente: ${error.message}`);
  return data;
}

/** Para seletores que referenciam `pacientes.id` (Fluxo, tarefas,
 * pagamentos, pendências) — diferente de `listPacientesForSelect` em
 * paginas.queries.ts, que devolve `auth_id` (usado por consultas/checkins). */
export async function listPacientesResumo() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("pacientes")
    .select("id, auth_id, nome, status, fluxo_etapa, fluxo_urgente, fluxo_proxima_acao_em")
    .order("nome", { ascending: true });
  return data ?? [];
}

export async function getPacienteStats() {
  const supabase = await createClient();
  const [{ count: ativos }, { count: inativos }] = await Promise.all([
    supabase.from("pacientes").select("*", { count: "exact", head: true }).eq("status", "ativo"),
    supabase.from("pacientes").select("*", { count: "exact", head: true }).eq("status", "inativo"),
  ]);

  return { ativos: ativos ?? 0, inativos: inativos ?? 0 };
}
