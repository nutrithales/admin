import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database.types";

export type ConsultaComProntuario = Tables<"consultas"> & {
  prontuario: Tables<"consulta_prontuarios"> | null;
};

/** Todas as consultas de um paciente, com o prontuário privado anexado
 * quando existir — usado na aba "Prontuário" da página de detalhe. */
export async function listConsultasComProntuario(authId: string): Promise<ConsultaComProntuario[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("consultas")
    .select("*, prontuario:consulta_prontuarios(*)")
    .eq("auth_id", authId)
    .order("data", { ascending: false });

  if (error) throw new Error(`Erro ao carregar consultas: ${error.message}`);
  return ((data ?? []) as unknown as (Tables<"consultas"> & { prontuario: Tables<"consulta_prontuarios">[] })[]).map(
    (c) => ({ ...c, prontuario: c.prontuario[0] ?? null }),
  );
}
