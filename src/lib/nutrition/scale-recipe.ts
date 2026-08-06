import { calcularMacrosTotais, arredondarMacros, type MacroTotais } from "./calcular-macros";

export type PapelMacro = "proteina" | "carboidrato" | "gordura" | "livre";

export interface ItemParaEscalar {
  id: string;
  quantidade_base_g: number;
  papel_macro: PapelMacro;
  alimento: {
    kcal_100g: number;
    proteina_100g: number;
    carboidrato_100g: number;
    gordura_100g: number;
  };
}

export interface MetaEscala {
  proteina_g?: number;
  carboidrato_g?: number;
  gordura_g?: number;
}

export interface ItemEscalado {
  id: string;
  quantidade_final_g: number;
  fator: number;
}

export interface ResultadoEscala {
  itens: ItemEscalado[];
  totais: MacroTotais;
  fatores: { proteina: number; carboidrato: number; gordura: number };
  avisos: string[];
}

const FATOR_MIN = 0.3;
const FATOR_MAX = 3;

const GRUPOS = ["proteina", "carboidrato", "gordura"] as const;
type Grupo = (typeof GRUPOS)[number];

const macroKeyPorGrupo: Record<Grupo, keyof ItemParaEscalar["alimento"]> = {
  proteina: "proteina_100g",
  carboidrato: "carboidrato_100g",
  gordura: "gordura_100g",
};

const metaKeyPorGrupo: Record<Grupo, keyof MetaEscala> = {
  proteina: "proteina_g",
  carboidrato: "carboidrato_g",
  gordura: "gordura_g",
};

const labelPorGrupo: Record<Grupo, string> = {
  proteina: "proteína",
  carboidrato: "carboidrato",
  gordura: "gordura",
};

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

/**
 * Escala os itens de uma receita por PAPEL DE MACRO (não por fator único)
 * — o método real usado por nutricionistas pra "fechar o prato": agrupa
 * os itens por `papel_macro` e escala cada grupo pra bater o alvo de
 * gramas daquele macro na refeição, mantendo a proporção entre itens do
 * mesmo grupo. Itens `papel_macro: "livre"` (tempero, folhas) nunca
 * escalam. Função pura — sem I/O, sem chamada a IA, só aritmética.
 */
export function scaleRecipe(itens: ItemParaEscalar[], meta: MetaEscala): ResultadoEscala {
  const avisos: string[] = [];
  const fatores = { proteina: 1, carboidrato: 1, gordura: 1 };
  const itensEscalados: ItemEscalado[] = [];

  for (const grupo of GRUPOS) {
    const itensGrupo = itens.filter((i) => i.papel_macro === grupo);
    const metaGrupo = meta[metaKeyPorGrupo[grupo]];
    const macroKey = macroKeyPorGrupo[grupo];
    const somaAtual = itensGrupo.reduce((acc, i) => acc + (i.quantidade_base_g * i.alimento[macroKey]) / 100, 0);

    let fator = 1;
    if (metaGrupo != null && metaGrupo > 0) {
      if (somaAtual <= 0) {
        avisos.push(
          `Não há itens de ${labelPorGrupo[grupo]} nesta receita para atingir a meta (${metaGrupo}g) — adicione um item avulso desse papel.`,
        );
      } else {
        const fatorCalculado = metaGrupo / somaAtual;
        fator = Math.min(FATOR_MAX, Math.max(FATOR_MIN, fatorCalculado));
        if (fator !== fatorCalculado) {
          avisos.push(
            `Meta de ${labelPorGrupo[grupo]} não é alcançável só com os itens desta receita (fator calculado ${fatorCalculado.toFixed(2)}x, limitado a ${fator.toFixed(2)}x) — considere adicionar/trocar um item.`,
          );
        }
      }
    }

    fatores[grupo] = fator;
    for (const item of itensGrupo) {
      itensEscalados.push({ id: item.id, quantidade_final_g: round2(item.quantidade_base_g * fator), fator });
    }
  }

  for (const item of itens.filter((i) => i.papel_macro === "livre")) {
    itensEscalados.push({ id: item.id, quantidade_final_g: item.quantidade_base_g, fator: 1 });
  }

  const porId = new Map(itens.map((i) => [i.id, i]));
  const totais = arredondarMacros(
    calcularMacrosTotais(
      itensEscalados.map((ie) => ({
        quantidade_g: ie.quantidade_final_g,
        alimento: porId.get(ie.id)!.alimento,
      })),
    ),
  );

  return { itens: itensEscalados, totais, fatores, avisos };
}
