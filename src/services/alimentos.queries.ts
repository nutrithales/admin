import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database.types";

export async function listAlimentos(): Promise<Tables<"alimentos">[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("alimentos").select("*").order("nome", { ascending: true });

  if (error) throw new Error(`Erro ao carregar alimentos: ${error.message}`);
  return data ?? [];
}

export async function getAlimento(id: string): Promise<Tables<"alimentos"> | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("alimentos").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(`Erro ao carregar alimento: ${error.message}`);
  return data;
}

export interface AlimentoOption {
  id: string;
  nome: string;
  origem: string;
  kcal_100g: number;
  proteina_100g: number;
  carboidrato_100g: number;
  gordura_100g: number;
  porcao_padrao_g: number | null;
  grupo_alimentar: string | null;
  medidas_caseiras?: Tables<"alimentos">["medidas_caseiras"];
}

export async function searchAlimentos(query: string, limit = 20): Promise<AlimentoOption[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("alimentos")
    .select("id, nome, origem, kcal_100g, proteina_100g, carboidrato_100g, gordura_100g, porcao_padrao_g, grupo_alimentar, medidas_caseiras")
    .eq("ativo", true)
    .ilike("nome", `%${query}%`)
    .order("nome", { ascending: true })
    .limit(limit);

  if (error) throw new Error(`Erro ao buscar alimentos: ${error.message}`);
  return data ?? [];
}
