import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database.types";

export type ProtocoloRefeicaoComPreferidas = Tables<"protocolo_refeicoes"> & {
  preferidas: (Tables<"protocolo_refeicoes_preferidas"> & {
    refeicao_modelo: Pick<Tables<"refeicoes_modelo">, "id" | "nome"> | null;
  })[];
};

export type ProtocoloComDetalhes = Tables<"protocolos"> & {
  refeicoes: ProtocoloRefeicaoComPreferidas[];
  receitas_preferidas: (Tables<"protocolo_receitas_preferidas"> & {
    receita: Pick<Tables<"receitas">, "id" | "nome"> | null;
  })[];
  regra_macro: Tables<"protocolo_regras_macro">[];
};

const SELECT_COMPLETO = `*,
  refeicoes:protocolo_refeicoes(
    *,
    preferidas:protocolo_refeicoes_preferidas(*, refeicao_modelo:refeicoes_modelo(id, nome))
  ),
  receitas_preferidas:protocolo_receitas_preferidas(*, receita:receitas(id, nome)),
  regra_macro:protocolo_regras_macro(*)`;

export async function listProtocolos(): Promise<ProtocoloComDetalhes[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("protocolos").select(SELECT_COMPLETO).order("nome", { ascending: true });

  if (error) throw new Error(`Erro ao carregar protocolos: ${error.message}`);
  return (data ?? []) as unknown as ProtocoloComDetalhes[];
}

export async function getProtocolo(id: string): Promise<ProtocoloComDetalhes | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("protocolos").select(SELECT_COMPLETO).eq("id", id).maybeSingle();

  if (error) throw new Error(`Erro ao carregar protocolo: ${error.message}`);
  return data as unknown as ProtocoloComDetalhes | null;
}

export interface ProtocoloOption {
  id: string;
  nome: string;
}

export async function listProtocolosParaSelecao(): Promise<ProtocoloOption[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("protocolos").select("id, nome").eq("ativo", true).order("nome", { ascending: true });

  if (error) throw new Error(`Erro ao carregar protocolos: ${error.message}`);
  return data ?? [];
}
