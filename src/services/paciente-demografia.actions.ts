"use server";

import { revalidatePath } from "next/cache";
import { assertAdmin } from "@/lib/supabase/assert-admin";
import { createClient } from "@/lib/supabase/server";
import type { PacienteFormValues } from "@/utils/validation/paciente";
import {
  createPacienteAction,
  updatePacienteAction,
  type ActionResult,
} from "@/services/pacientes.actions";

/**
 * Mantém o fluxo existente de criação de usuário/senha intacto e persiste
 * os dados demográficos usados pela Matriz Nutricional no mesmo envio.
 */
export async function createPacienteComDemografiaAction(
  values: PacienteFormValues,
): Promise<ActionResult> {
  await assertAdmin();

  if (!values.data_nascimento) {
    return { success: false, message: "Informe a data de nascimento do paciente." };
  }

  if (!values.sexo_biologico) {
    return { success: false, message: "Informe o sexo biológico do paciente." };
  }

  const result = await createPacienteAction(values);
  if (!result.success) return result;

  const supabase = await createClient();
  const { error } = await supabase
    .from("pacientes")
    .update({
      data_nascimento: values.data_nascimento,
      sexo_biologico: values.sexo_biologico,
    } as never)
    .eq("email", values.email);

  if (error) {
    return {
      ...result,
      success: false,
      message: `Paciente criado, mas não foi possível salvar os dados demográficos: ${error.message}`,
    };
  }

  revalidatePath("/pacientes");
  revalidatePath("/matriz-nutricional");
  return result;
}

export async function updatePacienteComDemografiaAction(
  id: string,
  values: PacienteFormValues,
): Promise<ActionResult> {
  await assertAdmin();

  const result = await updatePacienteAction(id, values);
  if (!result.success) return result;

  const supabase = await createClient();
  const { error } = await supabase
    .from("pacientes")
    .update({
      data_nascimento: values.data_nascimento || null,
      sexo_biologico: values.sexo_biologico || null,
    } as never)
    .eq("id", id);

  if (error) {
    return {
      success: false,
      message: `Dados principais atualizados, mas os dados demográficos não puderam ser salvos: ${error.message}`,
    };
  }

  revalidatePath("/pacientes");
  revalidatePath(`/pacientes/${id}`);
  revalidatePath("/matriz-nutricional");
  return result;
}
