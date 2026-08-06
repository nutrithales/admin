import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database.types";

type AlimentoResumo = Pick<
  Tables<"alimentos">,
  "id" | "nome" | "origem" | "kcal_100g" | "proteina_100g" | "carboidrato_100g" | "gordura_100g" | "porcao_padrao_g" | "grupo_alimentar"
>;

export type ReceitaComItensResumo = Tables<"receitas"> & {
  itens: (Tables<"receita_itens"> & { alimento: AlimentoResumo })[];
};

export type OpcaoItemComDados = Tables<"refeicao_modelo_opcao_itens"> & {
  alimento: AlimentoResumo | null;
  receita: ReceitaComItensResumo | null;
};

export type OpcaoComItens = Tables<"refeicao_modelo_opcoes"> & {
  itens: OpcaoItemComDados[];
};

export type RefeicaoModeloComOpcoes = Tables<"refeicoes_modelo"> & {
  opcoes: OpcaoComItens[];
};

const SELECT_COMPLETO = `*, opcoes:refeicao_modelo_opcoes(
  *,
  itens:refeicao_modelo_opcao_itens(
    *,
    alimento:alimentos(id, nome, origem, kcal_100g, proteina_100g, carboidrato_100g, gordura_100g, porcao_padrao_g, grupo_alimentar),
    receita:receitas(*, itens:receita_itens(*, alimento:alimentos(id, nome, origem, kcal_100g, proteina_100g, carboidrato_100g, gordura_100g, porcao_padrao_g, grupo_alimentar)))
  )
)`;

export async function listRefeicoesModelo(): Promise<RefeicaoModeloComOpcoes[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("refeicoes_modelo").select(SELECT_COMPLETO).order("nome", { ascending: true });

  if (error) throw new Error(`Erro ao carregar refeições-modelo: ${error.message}`);
  return (data ?? []) as unknown as RefeicaoModeloComOpcoes[];
}

export async function getRefeicaoModelo(id: string): Promise<RefeicaoModeloComOpcoes | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("refeicoes_modelo").select(SELECT_COMPLETO).eq("id", id).maybeSingle();

  if (error) throw new Error(`Erro ao carregar refeição-modelo: ${error.message}`);
  return data as unknown as RefeicaoModeloComOpcoes | null;
}

export interface RefeicaoModeloOption {
  id: string;
  nome: string;
  tags: string[];
}

export async function listRefeicoesModeloParaSelecao(): Promise<RefeicaoModeloOption[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("refeicoes_modelo")
    .select("id, nome, tags")
    .eq("ativo", true)
    .order("nome", { ascending: true });

  if (error) throw new Error(`Erro ao carregar refeições-modelo: ${error.message}`);
  return data ?? [];
}

export async function searchRefeicoesModelo(query: string, limit = 20): Promise<RefeicaoModeloOption[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("refeicoes_modelo")
    .select("id, nome, tags")
    .eq("ativo", true)
    .ilike("nome", `%${query}%`)
    .order("nome", { ascending: true })
    .limit(limit);

  if (error) throw new Error(`Erro ao buscar refeições-modelo: ${error.message}`);
  return data ?? [];
}
