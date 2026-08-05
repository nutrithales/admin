import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database.types";

export type HistoricoIaComPaciente = Tables<"historico_ia"> & {
  paciente: Pick<Tables<"pacientes">, "id" | "nome"> | null;
};

export async function listHistoricoIa(limit = 50): Promise<HistoricoIaComPaciente[]> {
  const supabase = await createClient();
  const [{ data: historico, error }, { data: pacientes }] = await Promise.all([
    supabase
      .from("historico_ia")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit),
    supabase.from("pacientes").select("id, auth_id, nome"),
  ]);

  if (error) throw new Error(`Erro ao carregar histórico de IA: ${error.message}`);

  const porAuthId = new Map((pacientes ?? []).map((p) => [p.auth_id, p]));
  return (historico ?? []).map((item) => ({
    ...item,
    paciente: porAuthId.get(item.auth_id) ?? null,
  }));
}
