/**
 * Soma determinística de macros — nunca por IA. Usada tanto no editor de
 * receitas (totais ao vivo) quanto em qualquer outro lugar que precise
 * agregar quantidade × macro/100g de uma lista de itens.
 */
export interface ItemComMacro {
  quantidade_g: number;
  alimento: {
    kcal_100g: number;
    proteina_100g: number;
    carboidrato_100g: number;
    gordura_100g: number;
  };
}

export interface MacroTotais {
  kcal: number;
  proteina_g: number;
  carboidrato_g: number;
  gordura_g: number;
}

export function calcularMacrosTotais(itens: ItemComMacro[]): MacroTotais {
  return itens.reduce(
    (acc, item) => {
      const fator = item.quantidade_g / 100;
      return {
        kcal: acc.kcal + item.alimento.kcal_100g * fator,
        proteina_g: acc.proteina_g + item.alimento.proteina_100g * fator,
        carboidrato_g: acc.carboidrato_g + item.alimento.carboidrato_100g * fator,
        gordura_g: acc.gordura_g + item.alimento.gordura_100g * fator,
      };
    },
    { kcal: 0, proteina_g: 0, carboidrato_g: 0, gordura_g: 0 },
  );
}

export function arredondarMacros(m: MacroTotais): MacroTotais {
  return {
    kcal: Math.round(m.kcal),
    proteina_g: Math.round(m.proteina_g * 10) / 10,
    carboidrato_g: Math.round(m.carboidrato_g * 10) / 10,
    gordura_g: Math.round(m.gordura_g * 10) / 10,
  };
}
