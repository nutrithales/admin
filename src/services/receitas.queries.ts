import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database.types";

export type ReceitaItemComAlimento = Tables<"receita_itens"> & {
  alimento: Pick<
    Tables<"alimentos">,
    "id" | "nome" | "kcal_100g" | "proteina_100g" | "carboidrato_100g" | "gordura_100g" | "porcao_padrao_g"
  >;
};

export type ReceitaComItens = Tables<"receitas"> & {
  itens: ReceitaItemComAlimento[];
};

export async function listReceitas(): Promise<ReceitaComItens[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("receitas")
    .select(
      "*, itens:receita_itens(*, alimento:alimentos(id, nome, kcal_100g, proteina_100g, carboidrato_100g, gordura_100g, porcao_padrao_g))",
    )
    .order("nome", { ascending: true });

  if (error) throw new Error(`Erro ao carregar receitas: ${error.message}`);
  return (data ?? []) as unknown as ReceitaComItens[];
}

export async function getReceita(id: string): Promise<ReceitaComItens | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("receitas")
    .select(
      "*, itens:receita_itens(*, alimento:alimentos(id, nome, kcal_100g, proteina_100g, carboidrato_100g, gordura_100g, porcao_padrao_g))",
    )
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(`Erro ao carregar receita: ${error.message}`);
  return data as unknown as ReceitaComItens | null;
}

export interface ReceitaOption {
  id: string;
  nome: string;
  tags: string[];
}

/** Lista compacta para Combobox/seletores (sem itens/macros). */
export async function listReceitasParaSelecao(): Promise<ReceitaOption[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("receitas")
    .select("id, nome, tags")
    .eq("ativo", true)
    .order("nome", { ascending: true });

  if (error) throw new Error(`Erro ao carregar receitas: ${error.message}`);
  return data ?? [];
}

export async function searchReceitas(query: string, limit = 20): Promise<ReceitaOption[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("receitas")
    .select("id, nome, tags")
    .eq("ativo", true)
    .ilike("nome", `%${query}%`)
    .order("nome", { ascending: true })
    .limit(limit);

  if (error) throw new Error(`Erro ao buscar receitas: ${error.message}`);
  return data ?? [];
}
