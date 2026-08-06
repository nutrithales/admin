"use server";

import { revalidatePath } from "next/cache";
import { assertAdmin } from "@/lib/supabase/assert-admin";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { pacienteSchema, type PacienteFormValues } from "@/utils/validation/paciente";
import { generateTemporaryPassword } from "@/utils/generate-password";
import { sendPatientCredentialsEmail } from "@/lib/email/patient-credentials";

export interface ActionResult {
  success: boolean;
  message: string;
  /** Only set right after a password is generated — shown once to the
   * admin so it can be handed to the patient. Never persisted or logged. */
  password?: string;
}

export async function createPacienteAction(values: PacienteFormValues): Promise<ActionResult> {
  await assertAdmin();
  const parsed = pacienteSchema.safeParse(values);
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const data = parsed.data;

  const supabase = await createClient();
  const admin = createAdminClient();
  const password = generateTemporaryPassword();

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: data.email,
    password,
    email_confirm: true,
    user_metadata: { nome: data.nome },
  });

  if (createError || !created.user) {
    return {
      success: false,
      message: `Não foi possível criar o acesso do paciente: ${createError?.message ?? "erro desconhecido"}.`,
    };
  }

  const { error: insertError } = await supabase.from("pacientes").insert({
    auth_id: created.user.id,
    nome: data.nome,
    email: data.email,
    telefone: data.telefone || null,
    cpf: data.cpf || null,
    plano: data.plano || null,
    status: data.status,
    data_inicio: data.data_inicio || null,
    peso_kg: data.peso_kg ?? null,
    altura_cm: data.altura_cm ?? null,
    objetivo: data.objetivo || null,
    nivel_atividade: data.nivel_atividade || null,
    treino_frequencia_semanal: data.treino_frequencia_semanal ?? null,
    restricoes_alimentares: data.restricoes_alimentares,
    preferencias_alimentares: data.preferencias_alimentares || null,
  });

  if (insertError) {
    await admin.auth.admin.deleteUser(created.user.id);
    return { success: false, message: `Erro ao salvar paciente: ${insertError.message}` };
  }

  const emailResult = await sendPatientCredentialsEmail({
    to: data.email,
    nome: data.nome,
    password,
  });

  revalidatePath("/pacientes");
  return {
    success: true,
    message: emailResult.ok
      ? "Paciente cadastrado. Um e-mail com a senha de acesso foi enviado a ele."
      : `Paciente cadastrado, mas o e-mail não pôde ser enviado (${emailResult.error}). Copie a senha abaixo e envie manualmente.`,
    password,
  };
}

export async function updatePacienteAction(
  id: string,
  values: PacienteFormValues,
): Promise<ActionResult> {
  await assertAdmin();
  const parsed = pacienteSchema.safeParse(values);
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const data = parsed.data;

  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("pacientes")
    .select("auth_id, email")
    .eq("id", id)
    .single();

  const { error: updateError } = await supabase
    .from("pacientes")
    .update({
      nome: data.nome,
      email: data.email,
      telefone: data.telefone || null,
      cpf: data.cpf || null,
      plano: data.plano || null,
      status: data.status,
      data_inicio: data.data_inicio || null,
      peso_kg: data.peso_kg ?? null,
      altura_cm: data.altura_cm ?? null,
      objetivo: data.objetivo || null,
      nivel_atividade: data.nivel_atividade || null,
      treino_frequencia_semanal: data.treino_frequencia_semanal ?? null,
      restricoes_alimentares: data.restricoes_alimentares,
      preferencias_alimentares: data.preferencias_alimentares || null,
    })
    .eq("id", id);

  if (updateError) {
    return { success: false, message: `Erro ao atualizar paciente: ${updateError.message}` };
  }

  if (existing?.auth_id && existing.email !== data.email) {
    const admin = createAdminClient();
    await admin.auth.admin.updateUserById(existing.auth_id, { email: data.email });
  }

  revalidatePath("/pacientes");
  return { success: true, message: "Paciente atualizado com sucesso." };
}

export async function deletePacienteAction(id: string): Promise<ActionResult> {
  await assertAdmin();
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("pacientes")
    .select("auth_id")
    .eq("id", id)
    .single();

  const { error } = await supabase.from("pacientes").delete().eq("id", id);
  if (error) return { success: false, message: `Erro ao excluir paciente: ${error.message}` };

  if (existing?.auth_id) {
    const admin = createAdminClient();
    await admin.auth.admin.deleteUser(existing.auth_id);
  }

  revalidatePath("/pacientes");
  return { success: true, message: "Paciente excluído." };
}

export async function setPacienteStatusAction(
  id: string,
  status: "ativo" | "inativo",
): Promise<ActionResult> {
  await assertAdmin();
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("pacientes")
    .select("auth_id")
    .eq("id", id)
    .single();

  const { error } = await supabase.from("pacientes").update({ status }).eq("id", id);
  if (error) return { success: false, message: `Erro ao atualizar status: ${error.message}` };

  if (existing?.auth_id) {
    const admin = createAdminClient();
    await admin.auth.admin.updateUserById(existing.auth_id, {
      ban_duration: status === "inativo" ? "876000h" : "none",
    });
  }

  revalidatePath("/pacientes");
  return {
    success: true,
    message: status === "ativo" ? "Acesso do paciente ativado." : "Acesso do paciente desativado.",
  };
}

export async function resetPacientePasswordAction(id: string): Promise<ActionResult> {
  await assertAdmin();
  const supabase = await createClient();

  const { data: existing, error: fetchError } = await supabase
    .from("pacientes")
    .select("auth_id, email, nome")
    .eq("id", id)
    .single();

  if (fetchError || !existing?.auth_id || !existing.email) {
    return { success: false, message: "Paciente não encontrado ou sem acesso configurado." };
  }

  const password = generateTemporaryPassword();
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(existing.auth_id, { password });

  if (error) {
    return { success: false, message: `Erro ao gerar nova senha: ${error.message}` };
  }

  const emailResult = await sendPatientCredentialsEmail({
    to: existing.email,
    nome: existing.nome ?? "",
    password,
  });

  return {
    success: true,
    message: emailResult.ok
      ? "Nova senha gerada e enviada por e-mail ao paciente."
      : `Nova senha gerada, mas o e-mail não pôde ser enviado (${emailResult.error}). Copie e envie manualmente.`,
    password,
  };
}

export async function changePacientePlanoAction(id: string, plano: string): Promise<ActionResult> {
  await assertAdmin();
  const supabase = await createClient();

  const { error } = await supabase.from("pacientes").update({ plano }).eq("id", id);
  if (error) return { success: false, message: `Erro ao alterar plano: ${error.message}` };

  revalidatePath("/pacientes");
  return { success: true, message: "Plano atualizado." };
}
