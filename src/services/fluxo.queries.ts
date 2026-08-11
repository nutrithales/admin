import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database.types";
import { FLUXO_ETAPAS, type FluxoEtapa } from "@/lib/clara/fluxo";

export type PacienteNoFluxo = Pick<
  Tables<"pacientes">,
  | "id"
  | "nome"
  | "telefone"
  | "plano"
  | "status"
  | "fluxo_etapa"
  | "fluxo_urgente"
  | "fluxo_observacoes"
  | "fluxo_proxima_acao_em"
>;

export async function listPacientesPorEtapa(): Promise<Record<FluxoEtapa, PacienteNoFluxo[]>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("pacientes")
    .select("id, nome, telefone, plano, status, fluxo_etapa, fluxo_urgente, fluxo_observacoes, fluxo_proxima_acao_em")
    .neq("status", "pendente")
    .order("nome", { ascending: true });

  if (error) throw new Error(`Erro ao carregar o Fluxo: ${error.message}`);

  const porEtapa = Object.fromEntries(FLUXO_ETAPAS.map((e) => [e, [] as PacienteNoFluxo[]])) as Record<
    FluxoEtapa,
    PacienteNoFluxo[]
  >;

  for (const paciente of data ?? []) {
    const etapa = FLUXO_ETAPAS.includes(paciente.fluxo_etapa as FluxoEtapa)
      ? (paciente.fluxo_etapa as FluxoEtapa)
      : "01_lead_recebido";
    porEtapa[etapa].push(paciente);
  }

  return porEtapa;
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
