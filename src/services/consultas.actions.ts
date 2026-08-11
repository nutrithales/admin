"use server";

import { revalidatePath } from "next/cache";
import { assertAdmin } from "@/lib/supabase/assert-admin";
import { createClient } from "@/lib/supabase/server";
import { consultaSchema, type ConsultaFormValues } from "@/utils/validation/consulta";
import type { ActionResult } from "@/services/pacientes.actions";
import type { ConsultaStatus } from "@/lib/clara/consultas";
import { syncPendencias } from "@/services/pendencias.actions";

export async function createConsultaAction(values: ConsultaFormValues): Promise<ActionResult> {
  await assertAdmin();
  const parsed = consultaSchema.safeParse(values);
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const supabase = await createClient();
  const { paciente_id, data_hora, observacoes, ...rest } = parsed.data;
  const { error } = await supabase.from("consultas").insert({
    ...rest,
    auth_id: paciente_id,
    data: data_hora,
    observacoes: observacoes || null,
  });
  if (error) return { success: false, message: `Erro ao agendar consulta: ${error.message}` };

  await syncPendencias();
  revalidatePath("/consultas");
  revalidatePath("/clara");
  return { success: true, message: "Consulta agendada." };
}

export async function updateConsultaAction(
  id: string,
  values: ConsultaFormValues,
): Promise<ActionResult> {
  await assertAdmin();
  const parsed = consultaSchema.safeParse(values);
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const supabase = await createClient();
  const { paciente_id, data_hora, observacoes, ...rest } = parsed.data;
  const { error } = await supabase
    .from("consultas")
    .update({ ...rest, auth_id: paciente_id, data: data_hora, observacoes: observacoes || null })
    .eq("id", id);
  if (error) return { success: false, message: `Erro ao atualizar consulta: ${error.message}` };

  await syncPendencias();
  revalidatePath("/consultas");
  revalidatePath("/clara");
  return { success: true, message: "Consulta atualizada." };
}

export async function deleteConsultaAction(id: string): Promise<ActionResult> {
  await assertAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("consultas").delete().eq("id", id);
  if (error) return { success: false, message: `Erro ao excluir consulta: ${error.message}` };

  await syncPendencias();
  revalidatePath("/consultas");
  revalidatePath("/clara");
  return { success: true, message: "Consulta excluída." };
}

const STATUS_LABEL: Record<ConsultaStatus, string> = {
  agendada: "marcada como agendada",
  confirmada: "confirmada",
  realizada: "marcada como realizada",
  cancelada: "cancelada",
  nao_compareceu: "marcada como não compareceu",
  reagendada: "marcada para reagendamento",
};

/** Muda o status de uma consulta (confirmar, concluir, cancelar, marcar
 * falta, reagendar) e recalcula a central de pendências em seguida — como
 * "consultas realizadas" é sempre derivado do histórico real (nunca um
 * contador armazenado), não existe risco de contagem duplicada aqui: mudar
 * o status de agendada→realizada é a única forma de uma consulta contar,
 * e mudar de volta (cancelar/reabrir) automaticamente deixa de contar. */
export async function updateConsultaStatusAction(
  id: string,
  status: ConsultaStatus,
): Promise<ActionResult> {
  await assertAdmin();
  const supabase = await createClient();

  const { error } = await supabase
    .from("consultas")
    .update({
      status,
      confirmada_em: status === "confirmada" ? new Date().toISOString() : undefined,
    })
    .eq("id", id);
  if (error) return { success: false, message: `Erro ao atualizar consulta: ${error.message}` };

  await syncPendencias();
  revalidatePath("/consultas");
  revalidatePath("/agenda");
  revalidatePath("/clara");
  revalidatePath("/pacientes");
  return { success: true, message: `Consulta ${STATUS_LABEL[status]}.` };
}
