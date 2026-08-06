import { z } from "zod";

export const alimentoSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome do alimento."),
  origem: z.string().trim().min(1, "Selecione a fonte."),
  origem_referencia: z.string().trim().optional().or(z.literal("")),
  kcal_100g: z.coerce.number().min(0, "Informe um valor válido."),
  proteina_100g: z.coerce.number().min(0, "Informe um valor válido."),
  carboidrato_100g: z.coerce.number().min(0, "Informe um valor válido."),
  gordura_100g: z.coerce.number().min(0, "Informe um valor válido."),
  porcao_padrao_g: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : v),
    z.coerce.number().positive().optional(),
  ),
  categoria: z.string().trim().optional().or(z.literal("")),
  grupo_alimentar: z.string().trim().optional().or(z.literal("")),
  tags_restricao: z.array(z.string()).default([]),
  ativo: z.boolean().default(true),
});

export type AlimentoFormValues = z.infer<typeof alimentoSchema>;

/** Ordem de prioridade entre fontes — usada para desempate quando o mesmo
 * alimento existe em mais de uma base (ex.: ordenar resultados do
 * Combobox), nunca para descartar dados. */
export const ORIGEM_PRIORIDADE = ["tbca_7_3", "fabricante", "tucunduva", "usda", "fao", "web", "manual"] as const;

export function origemPrioridade(origem: string): number {
  const idx = ORIGEM_PRIORIDADE.indexOf(origem as (typeof ORIGEM_PRIORIDADE)[number]);
  return idx === -1 ? ORIGEM_PRIORIDADE.length : idx;
}
