import { z } from "zod";

const optionalNumber = z.preprocess(
  (v) => (v === "" || v === null || v === undefined ? undefined : v),
  z.coerce.number().optional(),
);

export const avaliacaoFisicaSchema = z.object({
  consulta_id: z.string().uuid().optional().or(z.literal("")),
  peso_kg: optionalNumber,
  altura_cm: optionalNumber,
  circunferencia_cintura_cm: optionalNumber,
  circunferencia_quadril_cm: optionalNumber,
  circunferencia_braco_cm: optionalNumber,
  circunferencia_coxa_cm: optionalNumber,
  percentual_gordura: optionalNumber,
  massa_magra_kg: optionalNumber,
  massa_gorda_kg: optionalNumber,
  resumo_paciente: z.string().trim().optional().or(z.literal("")),
});

export type AvaliacaoFisicaFormValues = z.infer<typeof avaliacaoFisicaSchema>;
