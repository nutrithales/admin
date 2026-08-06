import { z } from "zod";

export const protocoloRefeicaoSchema = z.object({
  nome: z.string().trim().min(1, "Informe o nome do horário/refeição."),
  ordem: z.coerce.number().int().min(0).default(0),
  horario_sugerido: z.string().trim().optional().or(z.literal("")),
  percentual_kcal: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : v),
    z.coerce.number().min(0).max(100).optional(),
  ),
  refeicoes_modelo_ids: z.array(z.string().uuid()).default([]),
});

export const protocoloRegraMacroSchema = z.object({
  proteina_g_por_kg_min: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : v),
    z.coerce.number().min(0).optional(),
  ),
  proteina_g_por_kg_max: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : v),
    z.coerce.number().min(0).optional(),
  ),
  gordura_percentual_kcal_min: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : v),
    z.coerce.number().min(0).max(100).optional(),
  ),
  gordura_percentual_kcal_max: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : v),
    z.coerce.number().min(0).max(100).optional(),
  ),
});

export const protocoloSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome do protocolo."),
  descricao: z.string().trim().optional().or(z.literal("")),
  ativo: z.boolean().default(true),
  refeicoes: z.array(protocoloRefeicaoSchema).min(1, "Adicione pelo menos um horário de refeição."),
  receitas_preferidas_ids: z.array(z.string().uuid()).default([]),
  regra_macro: protocoloRegraMacroSchema.optional(),
});

export type ProtocoloRefeicaoFormValues = z.infer<typeof protocoloRefeicaoSchema>;
export type ProtocoloFormValues = z.infer<typeof protocoloSchema>;
