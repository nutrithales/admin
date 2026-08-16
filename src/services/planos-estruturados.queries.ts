import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database.types";

type AlimentoResumo = Pick<
  Tables<"alimentos">,
  | "id"
  | "nome"
  | "origem"
  | "kcal_100g"
  | "proteina_100g"
  | "carboidrato_100g"
  | "gordura_100g"
  | "porcao_padrao_g"
  | "medidas_caseiras"
>;

export type IngredienteComAlimento = Tables<"plano_refeicao_item_ingredientes"> & { alimento: AlimentoResumo };

export type PlanoItemComDados = Tables<"plano_refeicao_itens"> & {
  receita: Tables<"receitas"> | null;
  alimento: AlimentoResumo | null;
  ingredientes: IngredienteComAlimento[];
};

export type PlanoRefeicaoComItens = Tables<"plano_refeicoes"> & { itens: PlanoItemComDados[] };

export type PlanoEstruturadoCompleto = Tables<"planos_estruturados"> & {
  paciente: Pick<Tables<"pacientes">, "id" | "nome"> | null;
  protocolo: Pick<Tables<"protocolos">, "id" | "nome"> | null;
  refeicoes: PlanoRefeicaoComItens[];
};

const SELECT_COMPLETO = `*,
  refeicoes:plano_refeicoes(
    *,
    itens:plano_refeicao_itens(
      *,
      receita:receitas(*),
      alimento:alimentos(id, nome, origem, kcal_100g, proteina_100g, carboidrato_100g, gordura_100g, porcao_padrao_g, medidas_caseiras),
      ingredientes:plano_refeicao_item_ingredientes(*, alimento:alimentos(id, nome, origem, kcal_100g, proteina_100g, carboidrato_100g, gordura_100g, porcao_padrao_g, medidas_caseiras))
    )
  )`;

export async function getPlanoEstruturado(id: string): Promise<PlanoEstruturadoCompleto | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("planos_estruturados").select(SELECT_COMPLETO).eq("id", id).maybeSingle();

  if (error) throw new Error(`Erro ao carregar plano: ${error.message}`);
  if (!data) return null;

  const [{ data: paciente }, { data: protocolo }] = await Promise.all([
    supabase.from("pacientes").select("id, nome").eq("auth_id", data.auth_id).maybeSingle(),
    supabase.from("protocolos").select("id, nome").eq("id", data.protocolo_id).maybeSingle(),
  ]);

  return { ...(data as unknown as Omit<PlanoEstruturadoCompleto, "paciente" | "protocolo">), paciente: paciente ?? null, protocolo: protocolo ?? null };
}

export interface PlanoEstruturadoResumo {
  id: string;
  titulo: string | null;
  status: string;
  auth_id: string;
  created_at: string;
  paciente_nome: string | null;
}

export async function listPlanosEstruturados(): Promise<PlanoEstruturadoResumo[]> {
  const supabase = await createClient();
  const [{ data: planos, error }, { data: pacientes }] = await Promise.all([
    supabase.from("planos_estruturados").select("id, titulo, status, auth_id, created_at").order("created_at", { ascending: false }),
    supabase.from("pacientes").select("auth_id, nome"),
  ]);

  if (error) throw new Error(`Erro ao carregar planos: ${error.message}`);

  const nomePorAuthId = new Map((pacientes ?? []).map((p) => [p.auth_id, p.nome]));
  return (planos ?? []).map((p) => ({ ...p, paciente_nome: nomePorAuthId.get(p.auth_id) ?? null }));
}
