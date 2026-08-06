"use server";

import { revalidatePath } from "next/cache";
import { assertAdmin } from "@/lib/supabase/assert-admin";
import { createClient } from "@/lib/supabase/server";
import { alimentoSchema, type AlimentoFormValues } from "@/utils/validation/alimento";
import { searchAlimentos, type AlimentoOption } from "@/services/alimentos.queries";
import { buscarAlimentoComIA, type AlimentoEstimado } from "@/lib/ai/buscar-alimento";
import type { ActionResult } from "@/services/pacientes.actions";

/** Wrapper de Server Action sobre `searchAlimentos` — o Combobox roda no
 * cliente e não pode importar `alimentos.queries.ts` diretamente (é
 * `server-only`). */
export async function searchAlimentosAction(query: string): Promise<AlimentoOption[]> {
  await assertAdmin();
  return searchAlimentos(query);
}

interface BuscarAlimentoIAResult extends ActionResult {
  estimativa?: AlimentoEstimado;
}

/** Usada quando a busca não encontra o alimento na base — a IA propõe um
 * rascunho de cadastro (sempre marcado como estimativa), o nutricionista
 * revisa os campos no formulário antes de salvar. Nunca grava nada sozinha. */
export async function buscarAlimentoComIAAction(nome: string): Promise<BuscarAlimentoIAResult> {
  await assertAdmin();
  if (!nome.trim()) return { success: false, message: "Informe o nome do alimento primeiro." };

  try {
    const estimativa = await buscarAlimentoComIA(nome.trim());
    return { success: true, message: "Estimativa gerada — revise os valores antes de salvar.", estimativa };
  } catch (err) {
    return { success: false, message: err instanceof Error ? err.message : "Erro ao buscar com IA." };
  }
}

export interface SubstitutoOption extends AlimentoOption {
  /** Menor = mais parecido nutricionalmente na mesma quantidade. Soma das
   * diferenças percentuais de kcal/proteína/carboidrato/gordura — não é
   * uma unidade física, só serve pra ordenar. */
  distancia: number;
}

/** Sugere alimentos pra substituir `alimentoId` mantendo a mesma
 * quantidade — usado tanto na Receita Modular (trocar um componente)
 * quanto no builder de plano (trocar um ingrediente sem recalcular o
 * resto da refeição). Prioriza candidatos do mesmo grupo/categoria; se
 * não achar o suficiente, expande a busca pra base toda (ainda ordenado
 * por proximidade nutricional, então o resultado continua sensato). */
export async function findSubstitutosAction(alimentoId: string, quantidadeG: number, limit = 8): Promise<SubstitutoOption[]> {
  await assertAdmin();
  const supabase = await createClient();

  const { data } = await supabase.from("alimentos").select("*").eq("id", alimentoId).maybeSingle();
  if (!data) return [];
  const original = data;

  async function buscar(filtroGrupo: boolean): Promise<AlimentoOption[]> {
    let query = supabase
      .from("alimentos")
      .select("id, nome, origem, kcal_100g, proteina_100g, carboidrato_100g, gordura_100g, porcao_padrao_g, grupo_alimentar")
      .eq("ativo", true)
      .neq("id", alimentoId);
    if (filtroGrupo && original.grupo_alimentar) query = query.eq("grupo_alimentar", original.grupo_alimentar);
    else if (filtroGrupo && original.categoria) query = query.eq("categoria", original.categoria);
    const { data } = await query.limit(300);
    return (data ?? []) as unknown as AlimentoOption[];
  }

  let candidatos = original.grupo_alimentar || original.categoria ? await buscar(true) : [];
  if (candidatos.length < limit) candidatos = await buscar(false);

  const alvo = {
    kcal: (original.kcal_100g * quantidadeG) / 100,
    proteina: (original.proteina_100g * quantidadeG) / 100,
    carboidrato: (original.carboidrato_100g * quantidadeG) / 100,
    gordura: (original.gordura_100g * quantidadeG) / 100,
  };

  function pct(diff: number, base: number) {
    return Math.abs(diff) / Math.max(base, 1);
  }

  return candidatos
    .map((c) => {
      const atual = {
        kcal: (c.kcal_100g * quantidadeG) / 100,
        proteina: (c.proteina_100g * quantidadeG) / 100,
        carboidrato: (c.carboidrato_100g * quantidadeG) / 100,
        gordura: (c.gordura_100g * quantidadeG) / 100,
      };
      const distancia =
        pct(atual.kcal - alvo.kcal, alvo.kcal) +
        pct(atual.proteina - alvo.proteina, alvo.proteina) +
        pct(atual.carboidrato - alvo.carboidrato, alvo.carboidrato) +
        pct(atual.gordura - alvo.gordura, alvo.gordura);
      return { ...c, distancia };
    })
    .sort((a, b) => a.distancia - b.distancia)
    .slice(0, limit);
}

function toRow(data: AlimentoFormValues) {
  return {
    nome: data.nome,
    origem: data.origem,
    origem_referencia: data.origem_referencia || null,
    kcal_100g: data.kcal_100g,
    proteina_100g: data.proteina_100g,
    carboidrato_100g: data.carboidrato_100g,
    gordura_100g: data.gordura_100g,
    fibra_100g: data.fibra_100g ?? null,
    acucares_100g: data.acucares_100g ?? null,
    sodio_100g: data.sodio_100g ?? null,
    calcio_100g: data.calcio_100g ?? null,
    ferro_100g: data.ferro_100g ?? null,
    potassio_100g: data.potassio_100g ?? null,
    magnesio_100g: data.magnesio_100g ?? null,
    vitamina_a_100g: data.vitamina_a_100g ?? null,
    vitamina_c_100g: data.vitamina_c_100g ?? null,
    indice_glicemico: data.indice_glicemico ?? null,
    carga_glicemica: data.carga_glicemica ?? null,
    fator_coccao: data.fator_coccao ?? null,
    fator_correcao: data.fator_correcao ?? null,
    porcao_padrao_g: data.porcao_padrao_g ?? null,
    unidade_padrao: data.unidade_padrao || null,
    medidas_caseiras: data.medidas_caseiras,
    categoria: data.categoria || null,
    grupo_alimentar: data.grupo_alimentar || null,
    tags_restricao: data.tags_restricao,
    marca: data.marca || null,
    ingredientes: data.ingredientes || null,
    alergenos: data.alergenos,
    observacoes: data.observacoes || null,
    ativo: data.ativo,
    // edição manual pelo formulário conta como revisão, mesmo que o
    // alimento tenha sido criado automaticamente por importação de IA.
    revisado_manualmente: true,
  };
}

export async function createAlimentoAction(values: AlimentoFormValues): Promise<ActionResult> {
  await assertAdmin();
  const parsed = alimentoSchema.safeParse(values);
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("alimentos").insert(toRow(parsed.data));

  if (error) return { success: false, message: `Erro ao criar alimento: ${error.message}` };

  revalidatePath("/alimentos");
  return { success: true, message: "Alimento cadastrado." };
}

export async function updateAlimentoAction(id: string, values: AlimentoFormValues): Promise<ActionResult> {
  await assertAdmin();
  const parsed = alimentoSchema.safeParse(values);
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("alimentos").update(toRow(parsed.data)).eq("id", id);

  if (error) return { success: false, message: `Erro ao atualizar alimento: ${error.message}` };

  revalidatePath("/alimentos");
  return { success: true, message: "Alimento atualizado." };
}

export async function deleteAlimentoAction(id: string): Promise<ActionResult> {
  await assertAdmin();
  const supabase = await createClient();

  const { error } = await supabase.from("alimentos").delete().eq("id", id);
  if (error) {
    // FK com receita_itens/refeicao_modelo_opcao_itens usa `on delete restrict`
    // de propósito — não deixar apagar um alimento em uso silenciosamente.
    return {
      success: false,
      message: error.code === "23503" ? "Este alimento está em uso em receitas ou refeições." : `Erro ao excluir: ${error.message}`,
    };
  }

  revalidatePath("/alimentos");
  return { success: true, message: "Alimento excluído." };
}
