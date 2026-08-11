import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database.types";
import { FLUXO_ESTAGIOS, type FluxoEstagio } from "@/lib/clara/fluxo";

export type PacienteNoFluxo = Pick<
  Tables<"pacientes">,
  "id" | "nome" | "telefone" | "plano" | "status" | "fluxo_estagio"
>;

export async function listPacientesPorEstagio(): Promise<Record<FluxoEstagio, PacienteNoFluxo[]>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("pacientes")
    .select("id, nome, telefone, plano, status, fluxo_estagio")
    .neq("status", "pendente")
    .order("nome", { ascending: true });

  if (error) throw new Error(`Erro ao carregar o Fluxo: ${error.message}`);

  const porEstagio = Object.fromEntries(FLUXO_ESTAGIOS.map((e) => [e, [] as PacienteNoFluxo[]])) as Record<
    FluxoEstagio,
    PacienteNoFluxo[]
  >;

  for (const paciente of data ?? []) {
    const estagio = FLUXO_ESTAGIOS.includes(paciente.fluxo_estagio as FluxoEstagio)
      ? (paciente.fluxo_estagio as FluxoEstagio)
      : "novo_lead";
    porEstagio[estagio].push(paciente);
  }

  return porEstagio;
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
