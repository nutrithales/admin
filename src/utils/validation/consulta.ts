import { z } from "zod";
import { CONSULTA_STATUS } from "@/lib/clara/consultas";

export const consultaSchema = z.object({
  paciente_id: z.string().uuid("Selecione um paciente."),
  data_hora: z.string().trim().min(1, "Informe a data e hora."),
  tipo: z.enum(["presencial", "online"]),
  status: z.enum(CONSULTA_STATUS),
  observacoes: z.string().trim().optional().or(z.literal("")),
});

export type ConsultaFormValues = z.infer<typeof consultaSchema>;
