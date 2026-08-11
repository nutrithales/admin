import type { Tables } from "@/types/database.types";

/**
 * Vocabulário único de status de consulta. Antes da Clara, o CRUD manual
 * usava "concluida" enquanto a sincronização com a agenda pública e todo o
 * cálculo de consultas realizadas usavam "realizada" — a migration
 * 20260811210000 já normalizou os dados existentes para este vocabulário.
 */
export const CONSULTA_STATUS = [
  "agendada",
  "confirmada",
  "realizada",
  "cancelada",
  "nao_compareceu",
  "reagendada",
] as const;

export type ConsultaStatus = (typeof CONSULTA_STATUS)[number];

export const CONSULTA_STATUS_LABEL: Record<ConsultaStatus, string> = {
  agendada: "Agendada",
  confirmada: "Confirmada",
  realizada: "Realizada",
  cancelada: "Cancelada",
  nao_compareceu: "Não compareceu",
  reagendada: "Reagendada",
};

export const CONSULTA_STATUS_TONE: Record<ConsultaStatus, "brand" | "success" | "danger" | "warning" | "muted"> = {
  agendada: "brand",
  confirmada: "success",
  realizada: "success",
  cancelada: "danger",
  nao_compareceu: "danger",
  reagendada: "warning",
};

/** Duração padrão por tipo de atendimento, em minutos — regras já em uso na agenda. */
export const DURACAO_PADRAO_MINUTOS: Record<string, number> = {
  primeira_consulta: 90,
  retorno: 90,
  avaliacao_fisica: 45,
};

export interface ConsultasStats {
  realizadas: number;
  agendadas: number;
  restantes: number;
  ultimaConsultaDoPlano: boolean;
  planoFinalizado: boolean;
}

/** Consultas restantes/realizadas de um paciente — sempre recalculado a
 * partir do histórico real (nunca um contador que possa duplicar ou ficar
 * desatualizado). `consultas_realizadas_iniciais` cobre o histórico
 * anterior ao sistema e é editável pelo administrador. */
export function computeConsultasStats(
  paciente: Pick<Tables<"pacientes">, "consultas_incluidas" | "consultas_realizadas_iniciais">,
  consultas: Pick<Tables<"consultas">, "status">[],
): ConsultasStats {
  const realizadas =
    paciente.consultas_realizadas_iniciais +
    consultas.filter((c) => c.status === "realizada").length;
  const agendadas = consultas.filter((c) => c.status === "agendada" || c.status === "confirmada").length;
  const restantes = Math.max(0, paciente.consultas_incluidas - realizadas);

  return {
    realizadas,
    agendadas,
    restantes,
    ultimaConsultaDoPlano: restantes === 1,
    planoFinalizado: restantes === 0 && paciente.consultas_incluidas > 0,
  };
}
