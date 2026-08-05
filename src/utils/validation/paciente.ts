import { z } from "zod";

export const pacienteSchema = z.object({
  nome: z.string().trim().min(3, "Informe o nome completo."),
  email: z.string().trim().email("E-mail inválido."),
  telefone: z.string().trim().optional().or(z.literal("")),
  cpf: z.string().trim().optional().or(z.literal("")),
  plano: z.string().trim().optional().or(z.literal("")),
  status: z.enum(["ativo", "inativo", "pendente"]),
  data_inicio: z.string().trim().optional().or(z.literal("")),
});

export type PacienteFormValues = z.infer<typeof pacienteSchema>;

/** Standard mod-11 CPF checksum — rejects obviously fake numbers
 * (all-same-digit, wrong check digits) without a full validity lookup. */
export function isValidCPF(rawCpf: string): boolean {
  const cpf = rawCpf.replace(/\D/g, "");
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;

  for (const [length, weightStart] of [
    [9, 10],
    [10, 11],
  ] as const) {
    let sum = 0;
    for (let i = 0; i < length; i++) sum += Number(cpf[i]) * (weightStart - i);
    const check = ((sum * 10) % 11) % 10;
    if (check !== Number(cpf[length])) return false;
  }

  return true;
}

/** Public self-registration form — patients only supply identity data;
 * plano/status/data_inicio are the admin's call, so they're not exposed
 * here and every new signup lands as "pendente" server-side. */
export const pacienteSelfRegisterSchema = z.object({
  nome: z.string().trim().min(3, "Informe o nome completo."),
  email: z.string().trim().email("E-mail inválido."),
  telefone: z
    .string()
    .trim()
    .refine((v) => v.replace(/\D/g, "").length >= 10, "Informe um telefone válido com DDD."),
  cpf: z.string().trim().refine(isValidCPF, "CPF inválido."),
  // Honeypot: real users never fill this hidden field — anything here means a bot.
  website: z.string().max(0).optional().or(z.literal("")),
});

export type PacienteSelfRegisterValues = z.infer<typeof pacienteSelfRegisterSchema>;
