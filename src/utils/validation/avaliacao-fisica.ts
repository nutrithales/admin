import { z } from "zod";
import type { Json } from "@/types/database.types";

const optionalNumber = (label: string, max: number) =>
  z.preprocess(
    (value) => (value === "" || value === null || value === undefined ? undefined : value),
    z.coerce
      .number({ error: `${label} deve ser um número.` })
      .min(0, `${label} não pode ser negativo.`)
      .max(max, `${label} está fora do intervalo esperado.`)
      .optional(),
  );

export const avaliacaoExtraNumberFields = [
  "agua_corporal_percentual",
  "gordura_visceral_nivel",
  "massa_muscular_esqueletica_kg",
  "massa_ossea_kg",
  "idade_metabolica_anos",
  "taxa_metabolica_basal_kcal",
  "pressao_sistolica_mmhg",
  "pressao_diastolica_mmhg",
  "frequencia_cardiaca_repouso_bpm",
  "circunferencia_pescoco_cm",
  "circunferencia_ombros_cm",
  "circunferencia_torax_cm",
  "circunferencia_abdomen_cm",
  "circunferencia_braco_direito_relaxado_cm",
  "circunferencia_braco_esquerdo_relaxado_cm",
  "circunferencia_braco_direito_contraido_cm",
  "circunferencia_braco_esquerdo_contraido_cm",
  "circunferencia_antebraco_direito_cm",
  "circunferencia_antebraco_esquerdo_cm",
  "circunferencia_coxa_direita_cm",
  "circunferencia_coxa_esquerda_cm",
  "circunferencia_panturrilha_direita_cm",
  "circunferencia_panturrilha_esquerda_cm",
  "dobra_peitoral_mm",
  "dobra_axilar_media_mm",
  "dobra_tricipital_mm",
  "dobra_subescapular_mm",
  "dobra_bicipital_mm",
  "dobra_suprailiaca_mm",
  "dobra_abdominal_mm",
  "dobra_coxa_mm",
  "dobra_panturrilha_mm",
] as const;

export const avaliacaoExtraTextFields = [
  "metodo",
  "protocolo",
  "condicoes_avaliacao",
  "observacoes",
] as const;

type OptionalNumberSchema = ReturnType<typeof optionalNumber>;

const extraNumbers = Object.fromEntries(
  avaliacaoExtraNumberFields.map((field) => {
    const max = field.includes("percentual")
      ? 100
      : field.includes("mmhg")
        ? 300
        : field.includes("bpm")
          ? 250
          : field.includes("kcal")
            ? 10000
            : field.includes("idade")
              ? 150
              : field.includes("nivel")
                ? 100
                : field.includes("dobra")
                  ? 150
                  : field.includes("circunferencia")
                    ? 400
                    : 500;
    return [field, optionalNumber("Medida", max)];
  }),
) as { [Key in (typeof avaliacaoExtraNumberFields)[number]]: OptionalNumberSchema };

export const avaliacaoFisicaSchema = z.object({
  data: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Informe uma data válida.")
    .refine((value) => {
      const parsed = new Date(`${value}T12:00:00.000Z`);
      return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
    }, "Informe uma data válida."),
  consulta_id: z.string().uuid().optional().or(z.literal("")),
  peso_kg: optionalNumber("Peso", 500),
  altura_cm: optionalNumber("Altura", 300),
  circunferencia_cintura_cm: optionalNumber("Cintura", 400),
  circunferencia_quadril_cm: optionalNumber("Quadril", 400),
  circunferencia_braco_cm: optionalNumber("Braço", 200),
  circunferencia_coxa_cm: optionalNumber("Coxa", 250),
  percentual_gordura: optionalNumber("Percentual de gordura", 100),
  massa_magra_kg: optionalNumber("Massa magra", 500),
  massa_gorda_kg: optionalNumber("Massa gorda", 500),
  metodo: z.string().trim().max(80).optional().or(z.literal("")),
  protocolo: z.string().trim().max(120).optional().or(z.literal("")),
  condicoes_avaliacao: z.string().trim().max(1000).optional().or(z.literal("")),
  observacoes: z.string().trim().max(3000).optional().or(z.literal("")),
  resumo_paciente: z.string().trim().max(5000).optional().or(z.literal("")),
  ...extraNumbers,
});

export type AvaliacaoFisicaFormValues = z.infer<typeof avaliacaoFisicaSchema>;

export function getMedidasExtraRecord(value: Json | null | undefined): Record<string, Json | undefined> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value;
}

export function getExtraNumber(value: Json | null | undefined, key: (typeof avaliacaoExtraNumberFields)[number]) {
  const raw = getMedidasExtraRecord(value)[key];
  return typeof raw === "number" && Number.isFinite(raw) ? raw : undefined;
}

export function getExtraText(value: Json | null | undefined, key: (typeof avaliacaoExtraTextFields)[number]) {
  const raw = getMedidasExtraRecord(value)[key];
  return typeof raw === "string" ? raw : "";
}

export function buildMedidasExtra(data: AvaliacaoFisicaFormValues, current?: Json | null): Json {
  const next: Record<string, Json | undefined> = { ...getMedidasExtraRecord(current), versao: 2 };

  for (const key of avaliacaoExtraNumberFields) {
    const value = data[key];
    if (typeof value === "number" && Number.isFinite(value)) next[key] = value;
    else delete next[key];
  }

  for (const key of avaliacaoExtraTextFields) {
    const value = data[key]?.trim();
    if (value) next[key] = value;
    else delete next[key];
  }

  return next;
}

export function calculateAvaliacaoMetrics(
  values: Pick<
    AvaliacaoFisicaFormValues,
    | "peso_kg"
    | "altura_cm"
    | "percentual_gordura"
    | "massa_magra_kg"
    | "massa_gorda_kg"
    | "circunferencia_cintura_cm"
    | "circunferencia_quadril_cm"
  >,
) {
  const peso = values.peso_kg;
  const alturaM = values.altura_cm ? values.altura_cm / 100 : undefined;
  const gordura = values.percentual_gordura;
  const massaGordaCalculada = peso !== undefined && gordura !== undefined ? (peso * gordura) / 100 : undefined;

  return {
    imc: peso !== undefined && alturaM ? peso / (alturaM * alturaM) : undefined,
    rcq:
      values.circunferencia_cintura_cm !== undefined && values.circunferencia_quadril_cm
        ? values.circunferencia_cintura_cm / values.circunferencia_quadril_cm
        : undefined,
    rce:
      values.circunferencia_cintura_cm !== undefined && values.altura_cm
        ? values.circunferencia_cintura_cm / values.altura_cm
        : undefined,
    massaGordaKg: values.massa_gorda_kg ?? massaGordaCalculada,
    massaMagraKg:
      values.massa_magra_kg ??
      (peso !== undefined && massaGordaCalculada !== undefined ? peso - massaGordaCalculada : undefined),
  };
}
