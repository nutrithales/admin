import { z } from "zod";

export const consultaSchema = z.object({
  paciente_id: z.string().uuid("Selecione um paciente."),
  data_hora: z.string().trim().min(1, "Informe a data e hora."),
  tipo: z.enum(["presencial", "online"]),
  status: z.enum(["agendada", "concluida", "cancelada"]),
  observacoes: z.string().trim().optional().or(z.literal("")),
});

export type ConsultaFormValues = z.infer<typeof consultaSchema>;
