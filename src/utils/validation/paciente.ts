import { z } from "zod";

export const pacienteSchema = z.object({
  nome: z.string().trim().min(3, "Informe o nome completo."),
  email: z.string().trim().email("E-mail inválido."),
  telefone: z.string().trim().optional().or(z.literal("")),
  cpf: z.string().trim().optional().or(z.literal("")),
  plano: z.string().trim().optional().or(z.literal("")),
  status: z.enum(["ativo", "inativo"]),
  data_inicio: z.string().trim().optional().or(z.literal("")),
});

export type PacienteFormValues = z.infer<typeof pacienteSchema>;
