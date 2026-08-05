import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database.types";

export type PlanoAlimentarComPaciente = Tables<"planos_alimentares"> & {
  paciente: Pick<Tables<"pacientes">, "id" | "nome"> | null;
};

export async function listPlanosAlimentares(): Promise<PlanoAlimentarComPaciente[]> {
  const supabase = await createClient();
  const [{ data: planos, error }, { data: pacientes }] = await Promise.all([
    supabase.from("planos_alimentares").select("*").order("data_envio", { ascending: false }),
    supabase.from("pacientes").select("id, auth_id, nome"),
  ]);

  if (error) throw new Error(`Erro ao carregar planos alimentares: ${error.message}`);

  const porAuthId = new Map((pacientes ?? []).map((p) => [p.auth_id, p]));
  return (planos ?? []).map((plano) => ({
    ...plano,
    paciente: porAuthId.get(plano.auth_id) ?? null,
  }));
}
