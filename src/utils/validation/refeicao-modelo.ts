import { z } from "zod";

export const refeicaoModeloOpcaoItemSchema = z
  .object({
    receita_id: z.string().uuid().optional(),
    alimento_id: z.string().uuid().optional(),
    quantidade_g: z.preprocess(
      (v) => (v === "" || v === null || v === undefined ? undefined : v),
      z.coerce.number().positive().optional(),
    ),
    ordem: z.coerce.number().int().min(0).default(0),
  })
  .refine((v) => Boolean(v.receita_id) !== Boolean(v.alimento_id), {
    message: "Escolha uma receita ou um alimento avulso, não os dois.",
  });

export const refeicaoModeloOpcaoSchema = z.object({
  nome: z.string().trim().min(1, "Informe o nome da opção."),
  ordem: z.coerce.number().int().min(0).default(0),
  itens: z.array(refeicaoModeloOpcaoItemSchema).min(1, "Adicione pelo menos um item na opção."),
});

export const refeicaoModeloSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome da refeição."),
  tags: z.array(z.string()).default([]),
  ativo: z.boolean().default(true),
  opcoes: z.array(refeicaoModeloOpcaoSchema).min(1, "Adicione pelo menos uma opção."),
});

export type RefeicaoModeloOpcaoItemFormValues = z.infer<typeof refeicaoModeloOpcaoItemSchema>;
export type RefeicaoModeloOpcaoFormValues = z.infer<typeof refeicaoModeloOpcaoSchema>;
export type RefeicaoModeloFormValues = z.infer<typeof refeicaoModeloSchema>;
