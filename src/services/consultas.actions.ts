"use server";

import { revalidatePath } from "next/cache";
import { assertAdmin } from "@/lib/supabase/assert-admin";
import { createClient } from "@/lib/supabase/server";
import { consultaSchema, type ConsultaFormValues } from "@/utils/validation/consulta";
import type { ActionResult } from "@/services/pacientes.actions";

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

  revalidatePath("/consultas");
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

  revalidatePath("/consultas");
  return { success: true, message: "Consulta atualizada." };
}

export async function deleteConsultaAction(id: string): Promise<ActionResult> {
  await assertAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("consultas").delete().eq("id", id);
  if (error) return { success: false, message: `Erro ao excluir consulta: ${error.message}` };

  revalidatePath("/consultas");
  return { success: true, message: "Consulta excluída." };
}
