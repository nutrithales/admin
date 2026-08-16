export type PapelItemClinico =
  | "proteina"
  | "carboidrato"
  | "gordura"
  | "misto"
  | "vegetal_b"
  | "livre";

export interface AlimentoMacroClinico {
  kcal_100g: number;
  proteina_100g: number;
  carboidrato_100g: number;
  gordura_100g: number;
}

export interface ItemModeloClinico {
  id: string;
  alimento_id: string;
  quantidade_base_g: number;
  papel_macro: PapelItemClinico;
  contabiliza_macros: boolean;
  quantidade_min_g?: number | null;
  quantidade_max_g?: number | null;
  arredondamento_g?: number | null;
  grupo_substituicao_id?: string | null;
  alimento: AlimentoMacroClinico;
}

export interface MetaRefeicaoClinica {
  proteina_g?: number | null;
  carboidrato_g?: number | null;
  gordura_g?: number | null;
  kcal?: number | null;
}

export interface ItemModeloEscalado {
  id: string;
  alimento_id: string;
  quantidade_final_g: number;
  fator_escala: number;
  papel_macro: PapelItemClinico;
  contabiliza_macros: boolean;
  grupo_substituicao_id?: string | null;
  quantidade_min_g?: number | null;
  quantidade_max_g?: number | null;
  arredondamento_g: number;
}

export interface TotaisRefeicaoClinica {
  kcal: number;
  proteina_g: number;
  carboidrato_g: number;
  gordura_g: number;
}

export interface ResultadoEscalaRefeicaoClinica {
  itens: ItemModeloEscalado[];
  totais: TotaisRefeicaoClinica;
  avisos: string[];
}

const PAPEL_PARA_MACRO = {
  proteina: "proteina_100g",
  carboidrato: "carboidrato_100g",
  gordura: "gordura_100g",
} as const;

const PAPEL_PARA_META = {
  proteina: "proteina_g",
  carboidrato: "carboidrato_g",
  gordura: "gordura_g",
} as const;

type PapelAjustavel = keyof typeof PAPEL_PARA_MACRO;

function numero(valor: unknown) {
  const n = Number(valor);
  return Number.isFinite(n) ? n : 0;
}

function arredondarQuantidade(valor: number, passo: number) {
  const incremento = passo > 0 ? passo : 5;
  return Math.max(0, Math.round(valor / incremento) * incremento);
}

function limitar(valor: number, minimo?: number | null, maximo?: number | null) {
  let final = valor;
  if (minimo != null) final = Math.max(final, minimo);
  if (maximo != null) final = Math.min(final, maximo);
  return final;
}

function macroDoItem(item: ItemModeloClinico, quantidadeG: number, macro: keyof AlimentoMacroClinico) {
  return (quantidadeG * numero(item.alimento[macro])) / 100;
}

function totaisDosItens(
  itensOriginais: Map<string, ItemModeloClinico>,
  quantidades: Map<string, number>,
): TotaisRefeicaoClinica {
  const total = { kcal: 0, proteina_g: 0, carboidrato_g: 0, gordura_g: 0 };

  for (const [id, quantidade] of quantidades) {
    const item = itensOriginais.get(id);
    if (!item || !item.contabiliza_macros || item.papel_macro === "livre") continue;
    total.kcal += macroDoItem(item, quantidade, "kcal_100g");
    total.proteina_g += macroDoItem(item, quantidade, "proteina_100g");
    total.carboidrato_g += macroDoItem(item, quantidade, "carboidrato_100g");
    total.gordura_g += macroDoItem(item, quantidade, "gordura_100g");
  }

  return total;
}

function round1(valor: number) {
  return Math.round(valor * 10) / 10;
}

/**
 * Escala uma refeição-modelo de forma determinística.
 *
 * Regras clínicas/operacionais:
 * - `livre`: não entra no fechamento de energia/macros e não é escalado;
 * - `vegetal_b` e `misto`: entram nos totais, mas permanecem em porção-base;
 * - proteína/carboidrato/gordura: cada grupo é ajustado pelo seu macro primário,
 *   respeitando mínimo, máximo e arredondamento culinário;
 * - após cada ajuste os nutrientes secundários são recalculados, evitando tratar
 *   um alimento como se fornecesse apenas um macronutriente.
 */
export function scaleMealModel(
  itens: ItemModeloClinico[],
  meta: MetaRefeicaoClinica,
): ResultadoEscalaRefeicaoClinica {
  const avisos: string[] = [];
  const porId = new Map(itens.map((item) => [item.id, item]));
  const quantidades = new Map<string, number>();

  for (const item of itens) {
    const passo = numero(item.arredondamento_g) || 5;
    const base = limitar(numero(item.quantidade_base_g), item.quantidade_min_g, item.quantidade_max_g);
    quantidades.set(item.id, arredondarQuantidade(base, passo));
  }

  const ajustarPapel = (papel: PapelAjustavel) => {
    const itensPapel = itens.filter((item) => item.papel_macro === papel && item.contabiliza_macros);
    const metaValor = numero(meta[PAPEL_PARA_META[papel]]);
    if (metaValor <= 0 || itensPapel.length === 0) return;

    const macroKey = PAPEL_PARA_MACRO[papel];
    const contribuicaoOutros = itens
      .filter((item) => item.contabiliza_macros && item.papel_macro !== "livre" && item.papel_macro !== papel)
      .reduce((acc, item) => acc + macroDoItem(item, quantidades.get(item.id) ?? 0, macroKey), 0);

    const alvoGrupo = Math.max(0, metaValor - contribuicaoOutros);
    const atualGrupo = itensPapel.reduce(
      (acc, item) => acc + macroDoItem(item, quantidades.get(item.id) ?? 0, macroKey),
      0,
    );

    if (atualGrupo <= 0) {
      avisos.push(`Não há ${papel} suficiente no modelo para ajustar a meta desta refeição.`);
      return;
    }

    const fator = alvoGrupo / atualGrupo;
    for (const item of itensPapel) {
      const atual = quantidades.get(item.id) ?? item.quantidade_base_g;
      const passo = numero(item.arredondamento_g) || 5;
      const desejado = atual * fator;
      const limitado = limitar(desejado, item.quantidade_min_g, item.quantidade_max_g);
      const arredondado = arredondarQuantidade(limitado, passo);
      quantidades.set(item.id, arredondado);

      if (Math.abs(limitado - desejado) > 0.01) {
        avisos.push(`Um item de ${papel} atingiu o limite de porção definido no modelo.`);
      }
    }
  };

  // Duas passagens refinam o fechamento após contabilizar os macros secundários.
  for (let passagem = 0; passagem < 2; passagem += 1) {
    ajustarPapel("proteina");
    ajustarPapel("carboidrato");
    ajustarPapel("gordura");
  }

  const totais = totaisDosItens(porId, quantidades);
  const comparar = (nome: string, realizado: number, alvo: number | null | undefined) => {
    if (!alvo || alvo <= 0) return;
    const diferenca = Math.abs(realizado - alvo) / alvo;
    if (diferenca > 0.12) {
      avisos.push(`${nome} ficou ${Math.round(diferenca * 100)}% distante da meta após aplicar limites e arredondamentos.`);
    }
  };

  comparar("Proteína", totais.proteina_g, meta.proteina_g);
  comparar("Carboidrato", totais.carboidrato_g, meta.carboidrato_g);
  comparar("Gordura", totais.gordura_g, meta.gordura_g);

  const itensEscalados: ItemModeloEscalado[] = itens.map((item) => {
    const quantidadeFinal = quantidades.get(item.id) ?? item.quantidade_base_g;
    const base = item.quantidade_base_g > 0 ? item.quantidade_base_g : quantidadeFinal || 1;
    return {
      id: item.id,
      alimento_id: item.alimento_id,
      quantidade_final_g: quantidadeFinal,
      fator_escala: Math.round((quantidadeFinal / base) * 1000) / 1000,
      papel_macro: item.papel_macro,
      contabiliza_macros: item.contabiliza_macros,
      grupo_substituicao_id: item.grupo_substituicao_id,
      quantidade_min_g: item.quantidade_min_g,
      quantidade_max_g: item.quantidade_max_g,
      arredondamento_g: numero(item.arredondamento_g) || 5,
    };
  });

  return {
    itens: itensEscalados,
    totais: {
      kcal: round1(totais.kcal),
      proteina_g: round1(totais.proteina_g),
      carboidrato_g: round1(totais.carboidrato_g),
      gordura_g: round1(totais.gordura_g),
    },
    avisos: [...new Set(avisos)],
  };
}
