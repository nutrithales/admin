import { z } from "zod";

export const paginaSchema = z.object({
  paciente_id: z.string().uuid("Selecione um paciente."),
  tipo: z.string().trim().min(2, "Informe o tipo da página."),
  titulo: z.string().trim().min(2, "Informe o título."),
  icone: z.string().trim().optional().or(z.literal("")),
  url: z.string().trim().url("Informe uma URL válida (ex: https://...)."),
  ordem: z.coerce.number().int().min(0).default(0),
  ativo: z.boolean().default(true),
});

export type PaginaFormValues = z.infer<typeof paginaSchema>;
