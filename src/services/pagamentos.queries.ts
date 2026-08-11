import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database.types";

export async function listPagamentosPorPaciente(pacienteId: string): Promise<Tables<"pagamentos">[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("pagamentos")
    .select("*")
    .eq("paciente_id", pacienteId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Erro ao carregar pagamentos: ${error.message}`);
  return data ?? [];
}
