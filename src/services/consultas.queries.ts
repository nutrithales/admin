import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database.types";

export type ConsultaComPaciente = Tables<"consultas"> & {
  paciente: Pick<Tables<"pacientes">, "id" | "nome"> | null;
};

export async function listConsultas(): Promise<ConsultaComPaciente[]> {
  const supabase = await createClient();
  const [{ data: consultas, error }, { data: pacientes }] = await Promise.all([
    supabase.from("consultas").select("*").order("data", { ascending: false }),
    supabase.from("pacientes").select("id, auth_id, nome"),
  ]);

  if (error) throw new Error(`Erro ao carregar consultas: ${error.message}`);

  const porAuthId = new Map((pacientes ?? []).map((p) => [p.auth_id, p]));
  return (consultas ?? []).map((consulta) => ({
    ...consulta,
    paciente: porAuthId.get(consulta.auth_id) ?? null,
  }));
}
