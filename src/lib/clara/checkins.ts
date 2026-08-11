import type { Tables } from "@/types/database.types";

/** Periodicidade atual dos check-ins, em dias. */
export const CHECKIN_PERIODICIDADE_DIAS = 14;

/** Depois de quantos dias sem resposta um check-in enviado é considerado atrasado. */
export const CHECKIN_PRAZO_RESPOSTA_DIAS = 5;

export type CheckinSituacao = "em_dia" | "pendente_envio" | "aguardando_resposta" | "atrasado";

export function diasDesde(iso: string | null | undefined, hoje = new Date()): number | null {
  if (!iso) return null;
  const diffMs = hoje.getTime() - new Date(iso).getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/** Situação do check-in de um paciente, a partir do último registro (se
 * houver) e da data de início do acompanhamento. Não toma decisão clínica
 * — apenas indica se é hora de enviar, aguardar resposta ou revisar. */
export function checkinSituacao(
  ultimoCheckin: Pick<Tables<"checkins">, "status" | "enviado_em" | "respondido_em" | "created_at"> | null,
  dataInicio: string | null,
  hoje = new Date(),
): CheckinSituacao {
  if (!ultimoCheckin) {
    const dias = diasDesde(dataInicio, hoje);
    return dias !== null && dias >= CHECKIN_PERIODICIDADE_DIAS ? "pendente_envio" : "em_dia";
  }

  if (ultimoCheckin.status === "enviado") {
    const dias = diasDesde(ultimoCheckin.enviado_em, hoje) ?? 0;
    return dias > CHECKIN_PRAZO_RESPOSTA_DIAS ? "atrasado" : "aguardando_resposta";
  }

  if (ultimoCheckin.status === "pendente") return "pendente_envio";

  const referencia = ultimoCheckin.respondido_em ?? ultimoCheckin.created_at;
  const dias = diasDesde(referencia, hoje);
  return dias !== null && dias >= CHECKIN_PERIODICIDADE_DIAS ? "pendente_envio" : "em_dia";
}
