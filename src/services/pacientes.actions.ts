"use server";

import { revalidatePath } from "next/cache";
import { assertAdmin } from "@/lib/supabase/assert-admin";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { pacienteSchema, type PacienteFormValues } from "@/utils/validation/paciente";
import { generateTemporaryPassword } from "@/utils/generate-password";

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
  });

  if (insertError) {
    await admin.auth.admin.deleteUser(created.user.id);
    return { success: false, message: `Erro ao salvar paciente: ${insertError.message}` };
  }

  revalidatePath("/pacientes");
  return {
    success: true,
    message: "Paciente cadastrado. Copie a senha abaixo e envie ao paciente.",
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
    .select("auth_id")
    .eq("id", id)
    .single();

  if (fetchError || !existing?.auth_id) {
    return { success: false, message: "Paciente não encontrado ou sem acesso configurado." };
  }

  const password = generateTemporaryPassword();
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(existing.auth_id, { password });

  if (error) {
    return { success: false, message: `Erro ao gerar nova senha: ${error.message}` };
  }

  return {
    success: true,
    message: "Nova senha gerada. Copie e envie ao paciente.",
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
