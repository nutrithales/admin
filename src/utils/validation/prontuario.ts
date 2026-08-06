import { z } from "zod";

export const prontuarioSchema = z.object({
  prontuario: z.string().trim().optional().or(z.literal("")),
  resumo_granola: z.string().trim().optional().or(z.literal("")),
});

export type ProntuarioFormValues = z.infer<typeof prontuarioSchema>;
