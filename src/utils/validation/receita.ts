import { z } from "zod";

export const PAPEL_MACRO = ["proteina", "carboidrato", "gordura", "livre"] as const;

export const receitaItemSchema = z.object({
  alimento_id: z.string().uuid("Selecione um alimento."),
  quantidade_base_g: z.coerce.number().positive("Informe uma quantidade válida."),
  papel_macro: z.enum(PAPEL_MACRO),
  componente: z.string().trim().optional().or(z.literal("")),
  ordem: z.coerce.number().int().min(0).default(0),
});

export const receitaSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome da receita."),
  modo_preparo: z.string().trim().optional().or(z.literal("")),
  tags: z.array(z.string()).default([]),
  ativo: z.boolean().default(true),
  itens: z.array(receitaItemSchema).min(1, "Adicione pelo menos um ingrediente."),
});

export type ReceitaItemFormValues = z.infer<typeof receitaItemSchema>;
export type ReceitaFormValues = z.infer<typeof receitaSchema>;
