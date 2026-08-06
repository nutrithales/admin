import { z } from "zod";

const optionalNumber = z.preprocess(
  (v) => (v === "" || v === null || v === undefined ? undefined : v),
  z.coerce.number().optional(),
);

const optionalText = z.string().trim().optional().or(z.literal(""));

export const medidaCaseiraSchema = z.object({
  unidade: z.string().trim().min(1, "Informe o nome da medida."),
  peso_g: z.coerce.number().positive("Informe um peso válido."),
});

export const alimentoSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome do alimento."),
  origem: z.string().trim().min(1, "Selecione a fonte."),
  origem_referencia: optionalText,
  kcal_100g: z.coerce.number().min(0, "Informe um valor válido."),
  proteina_100g: z.coerce.number().min(0, "Informe um valor válido."),
  carboidrato_100g: z.coerce.number().min(0, "Informe um valor válido."),
  gordura_100g: z.coerce.number().min(0, "Informe um valor válido."),
  fibra_100g: optionalNumber,
  acucares_100g: optionalNumber,
  sodio_100g: optionalNumber,
  calcio_100g: optionalNumber,
  ferro_100g: optionalNumber,
  potassio_100g: optionalNumber,
  magnesio_100g: optionalNumber,
  vitamina_a_100g: optionalNumber,
  vitamina_c_100g: optionalNumber,
  indice_glicemico: optionalNumber,
  carga_glicemica: optionalNumber,
  fator_coccao: optionalNumber,
  fator_correcao: optionalNumber,
  porcao_padrao_g: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : v),
    z.coerce.number().positive().optional(),
  ),
  unidade_padrao: optionalText,
  medidas_caseiras: z.array(medidaCaseiraSchema).default([]),
  categoria: optionalText,
  grupo_alimentar: optionalText,
  tags_restricao: z.array(z.string()).default([]),
  marca: optionalText,
  ingredientes: optionalText,
  alergenos: z.array(z.string()).default([]),
  observacoes: optionalText,
  ativo: z.boolean().default(true),
});

export type AlimentoFormValues = z.infer<typeof alimentoSchema>;
export type MedidaCaseira = z.infer<typeof medidaCaseiraSchema>;

/** Ordem de prioridade entre fontes — usada para desempate quando o mesmo
 * alimento existe em mais de uma base (ex.: ordenar resultados do
 * Combobox), nunca para descartar dados. */
export const ORIGEM_PRIORIDADE = ["tbca_7_3", "fabricante", "tucunduva", "usda", "fao", "web", "manual"] as const;

export function origemPrioridade(origem: string): number {
  const idx = ORIGEM_PRIORIDADE.indexOf(origem as (typeof ORIGEM_PRIORIDADE)[number]);
  return idx === -1 ? ORIGEM_PRIORIDADE.length : idx;
}

/** Alimentos deste grupo sempre entram por porção (1, 2, 3...) em vez de
 * gramas — é assim que fruta é prescrita na prática ("1 banana", "2
 * maçãs"). Fica aqui (não em `alimentos.queries.ts`, que é `server-only`)
 * porque componentes de cliente (Combobox de alimento) precisam importar
 * esse valor. */
export const GRUPO_ALIMENTAR_FRUTA = "fruta";

/** Tags de restrição padrão — texto livre por convenção do projeto, mas
 * documentadas aqui pra sugerir valores consistentes no cadastro em vez
 * de cada nutricionista inventar um rótulo diferente pro mesmo conceito. */
export const TAGS_RESTRICAO_SUGERIDAS = [
  "contem_lactose",
  "contem_gluten",
  "vegetariano_ok",
  "vegano_ok",
  "low_carb",
  "alto_proteina",
  "rico_em_fibras",
] as const;
