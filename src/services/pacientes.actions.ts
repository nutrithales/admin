"use server";

import { revalidatePath } from "next/cache";
import { assertAdmin } from "@/lib/supabase/assert-admin";
import { assertPermission } from "@/lib/supabase/assert-permission";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { pacienteSchema, type PacienteFormValues } from "@/utils/validation/paciente";
import { generateTemporaryPassword } from "@/utils/generate-password";
import { sendPatientCredentialsEmail } from "@/lib/email/patient-credentials";
import { includedConsultations, normalizePlan } from "@/lib/agenda/plans";

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
    plano: data.plano ? normalizePlan(data.plano) : null,
    consultas_incluidas: includedConsultations(data.plano),
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
      plano: data.plano ? normalizePlan(data.plano) : null,
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
  await assertPermission("pacientes.excluir");
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
  const { error: updateError } = await admin.auth.admin.updateUserById(existing.auth_id, {
    password,
  });

  if (updateError) {
    const usuarioAusente = /user not found/i.test(updateError.message);
    if (!usuarioAusente) {
      return { success: false, message: `Erro ao gerar nova senha: ${updateError.message}` };
    }

    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email: existing.email,
      password,
      email_confirm: true,
      user_metadata: { nome: existing.nome ?? "" },
    });

    if (createError || !created.user) {
      return {
        success: false,
        message: `Erro ao reparar o acesso do paciente: ${createError?.message ?? "erro desconhecido"}`,
      };
    }

    const { error: linkError } = await supabase
      .from("pacientes")
      .update({ auth_id: created.user.id })
      .eq("id", id);

    if (linkError) {
      await admin.auth.admin.deleteUser(created.user.id);
      return {
        success: false,
        message: `A conta foi criada, mas não pôde ser vinculada ao paciente: ${linkError.message}`,
      };
    }
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

export interface BulkCredentialsResult {
  success: boolean;
  message: string;
  sent: number;
  failed: { nome: string; email: string; error: string }[];
}

/** Gera uma nova senha e reenvia as credenciais por e-mail para vários
 * pacientes de uma vez (mesma lógica de `resetPacientePasswordAction`, em
 * lote). Usado no painel para disparar o e-mail de acesso de pacientes
 * recém-importados sem precisar abrir um por um. */
export async function sendBulkCredentialsAction(ids: string[]): Promise<BulkCredentialsResult> {
  await assertAdmin();
  if (ids.length === 0) {
    return { success: false, message: "Nenhum paciente selecionado.", sent: 0, failed: [] };
  }

  const supabase = await createClient();
  const admin = createAdminClient();

  const { data: selecionados, error: fetchError } = await supabase
    .from("pacientes")
    .select("auth_id, email, nome")
    .in("id", ids);

  if (fetchError || !selecionados) {
    return {
      success: false,
      message: `Erro ao buscar pacientes: ${fetchError?.message ?? "erro desconhecido"}.`,
      sent: 0,
      failed: [],
    };
  }

  let sent = 0;
  const failed: { nome: string; email: string; error: string }[] = [];

  for (const p of selecionados) {
    const nome = p.nome ?? "";
    const email = p.email ?? "";
    if (!p.auth_id || !email) {
      failed.push({ nome, email, error: "sem acesso configurado" });
      continue;
    }

    const password = generateTemporaryPassword();
    const { error: updateError } = await admin.auth.admin.updateUserById(p.auth_id, { password });
    if (updateError) {
      failed.push({ nome, email, error: updateError.message });
      continue;
    }

    const emailResult = await sendPatientCredentialsEmail({ to: email, nome, password });
    if (!emailResult.ok) {
      failed.push({ nome, email, error: emailResult.error ?? "falha ao enviar e-mail" });
      continue;
    }

    sent++;
  }

  return {
    success: failed.length === 0,
    message:
      failed.length === 0
        ? `${sent} e-mail(s) de credenciais enviados com sucesso.`
        : `${sent} enviado(s), ${failed.length} falharam: ${failed.map((f) => f.nome || f.email).join(", ")}.`,
    sent,
    failed,
  };
}

/** Observações do Fluxo (recados de agenda/secretaria ligados ao estágio
 * atual do paciente no funil já existente) — nunca misturadas com
 * prontuário clínico, que fica em telas separadas. Reaproveita
 * `pacientes.fluxo_observacoes`, que já existe no sistema de Fluxo. */
export async function updateFluxoObservacoesAction(
  id: string,
  observacoes: string,
): Promise<ActionResult> {
  await assertAdmin();
  const supabase = await createClient();
  const { error } = await supabase
    .from("pacientes")
    .update({ fluxo_observacoes: observacoes || null, fluxo_updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { success: false, message: `Erro ao salvar observação: ${error.message}` };

  revalidatePath(`/pacientes/${id}`);
  return { success: true, message: "Observação salva." };
}

export async function changePacientePlanoAction(
  id: string,
  plano: string,
  consultasIncluidas: number,
  consultasRealizadasIniciais: number,
): Promise<ActionResult> {
  await assertAdmin();
  const supabase = await createClient();

  if (!Number.isInteger(consultasIncluidas) || consultasIncluidas < 1) {
    return { success: false, message: "Informe uma quantidade válida de consultas incluídas." };
  }
  if (!Number.isInteger(consultasRealizadasIniciais) || consultasRealizadasIniciais < 0) {
    return { success: false, message: "Informe uma quantidade válida de consultas realizadas." };
  }

  // Se o paciente estava no funil de renovação (fim do plano anterior), a
  // troca de plano é a própria renovação — avança o Fluxo para "renovado".
  const { data: pacienteAtual } = await supabase
    .from("pacientes")
    .select("fluxo_etapa")
    .eq("id", id)
    .maybeSingle();
  const emFunilDeRenovacao =
    pacienteAtual?.fluxo_etapa === "12_renovacao_30_dias" ||
    pacienteAtual?.fluxo_etapa === "13_proposta_renovacao" ||
    pacienteAtual?.fluxo_etapa === "15_reativacao_pendente";

  const { error } = await supabase
    .from("pacientes")
    .update({
      plano,
      consultas_incluidas: consultasIncluidas,
      consultas_realizadas_iniciais: consultasRealizadasIniciais,
      ...(emFunilDeRenovacao
        ? { fluxo_etapa: "16_renovado" as const, fluxo_updated_at: new Date().toISOString() }
        : {}),
    })
    .eq("id", id);
  if (error) return { success: false, message: `Erro ao alterar plano: ${error.message}` };

  revalidatePath("/pacientes");
  return { success: true, message: "Plano atualizado." };
}
