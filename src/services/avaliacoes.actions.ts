"use server";

import { revalidatePath } from "next/cache";
import { assertPermission } from "@/lib/supabase/assert-permission";
import { createClient } from "@/lib/supabase/server";
import {
  avaliacaoFisicaSchema,
  buildMedidasExtra,
  calculateAvaliacaoMetrics,
  type AvaliacaoFisicaFormValues,
} from "@/utils/validation/avaliacao-fisica";
import { sendEmail } from "@/lib/email/resend";
import { interpretarBodymetrix } from "@/lib/ai/interpretar-bodymetrix";
import type { ActionResult } from "@/services/pacientes.actions";
import type { Json } from "@/types/database.types";

const BUCKET = "avaliacoes";
const MAX_SIZE_BYTES = 20 * 1024 * 1024; // 20MB

function toAssessmentDate(date: string) {
  return new Date(`${date}T12:00:00.000Z`).toISOString();
}

function toRow(data: AvaliacaoFisicaFormValues, currentMedidasExtra?: Json | null) {
  const calculated = calculateAvaliacaoMetrics(data);
  return {
    data: toAssessmentDate(data.data),
    peso_kg: data.peso_kg ?? null,
    altura_cm: data.altura_cm ?? null,
    circunferencia_cintura_cm: data.circunferencia_cintura_cm ?? null,
    circunferencia_quadril_cm: data.circunferencia_quadril_cm ?? null,
    circunferencia_braco_cm: data.circunferencia_braco_cm ?? null,
    circunferencia_coxa_cm: data.circunferencia_coxa_cm ?? null,
    percentual_gordura: data.percentual_gordura ?? null,
    massa_magra_kg: calculated.massaMagraKg ?? null,
    massa_gorda_kg: calculated.massaGordaKg ?? null,
    medidas_extra: buildMedidasExtra(data, currentMedidasExtra),
    resumo_paciente: data.resumo_paciente || null,
  };
}

export async function createAvaliacaoFisicaAction(authId: string, values: AvaliacaoFisicaFormValues): Promise<ActionResult> {
  await assertPermission("avaliacoes.editar");
  const parsed = avaliacaoFisicaSchema.safeParse(values);
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const supabase = await createClient();

  const { error } = await supabase.from("avaliacoes_fisicas").insert({
    auth_id: authId,
    consulta_id: parsed.data.consulta_id || null,
    ...toRow(parsed.data),
  });

  if (error) return { success: false, message: `Erro ao criar avaliação: ${error.message}` };

  revalidatePath(`/pacientes/${authId}`);
  return { success: true, message: "Avaliação física registrada." };
}

export async function updateAvaliacaoFisicaAction(
  id: string,
  authId: string,
  values: AvaliacaoFisicaFormValues,
): Promise<ActionResult> {
  await assertPermission("avaliacoes.editar");
  const parsed = avaliacaoFisicaSchema.safeParse(values);
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const supabase = await createClient();

  const { data: existing, error: existingError } = await supabase
    .from("avaliacoes_fisicas")
    .select("medidas_extra, disponivel_paciente")
    .eq("id", id)
    .eq("auth_id", authId)
    .maybeSingle();

  if (existingError || !existing) return { success: false, message: "Avaliação não encontrada." };
  if (existing.disponivel_paciente && !parsed.data.resumo_paciente?.trim()) {
    return { success: false, message: "Revogue o acesso do paciente antes de apagar o resumo liberado." };
  }

  const { error } = await supabase
    .from("avaliacoes_fisicas")
    .update({
      consulta_id: parsed.data.consulta_id || null,
      ...toRow(parsed.data, existing.medidas_extra),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("auth_id", authId);

  if (error) return { success: false, message: `Erro ao atualizar avaliação: ${error.message}` };

  if (existing.disponivel_paciente && parsed.data.resumo_paciente?.trim()) {
    const { error: summaryError } = await supabase
      .from("avaliacoes_resumos_paciente")
      .update({ resumo: parsed.data.resumo_paciente.trim() })
      .eq("avaliacao_id", id)
      .eq("auth_id", authId);
    if (summaryError) {
      return { success: false, message: `As medidas foram salvas, mas o resumo liberado não foi atualizado: ${summaryError.message}` };
    }
  }

  revalidatePath(`/pacientes/${authId}`);
  return { success: true, message: "Avaliação atualizada." };
}

export async function deleteAvaliacaoFisicaAction(id: string, authId: string): Promise<ActionResult> {
  await assertPermission("avaliacoes.editar");
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("avaliacoes_fisicas")
    .select("path")
    .eq("id", id)
    .eq("auth_id", authId)
    .maybeSingle();

  if (!existing) return { success: false, message: "Avaliação não encontrada." };

  const { error } = await supabase.from("avaliacoes_fisicas").delete().eq("id", id).eq("auth_id", authId);
  if (error) return { success: false, message: `Erro ao excluir avaliação: ${error.message}` };

  if (existing?.path) await supabase.storage.from(BUCKET).remove([existing.path]);

  revalidatePath(`/pacientes/${authId}`);
  return { success: true, message: "Avaliação excluída." };
}

export async function uploadBodymetrixPdfAction(id: string, authId: string, formData: FormData): Promise<ActionResult> {
  await assertPermission("avaliacoes.editar");
  const file = formData.get("arquivo") as File | null;

  if (!file || file.size === 0) return { success: false, message: "Selecione um arquivo PDF." };
  if (file.type !== "application/pdf") return { success: false, message: "Envie um arquivo PDF." };
  if (file.size > MAX_SIZE_BYTES) return { success: false, message: "O arquivo deve ter até 20MB." };

  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("avaliacoes_fisicas")
    .select("path")
    .eq("id", id)
    .eq("auth_id", authId)
    .maybeSingle();

  if (!existing) return { success: false, message: "Avaliação não encontrada." };

  const path = `${authId}/${crypto.randomUUID()}.pdf`;
  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: "application/pdf" });
  if (uploadError) return { success: false, message: `Erro ao enviar arquivo: ${uploadError.message}` };

  const { error: updateError } = await supabase
    .from("avaliacoes_fisicas")
    .update({ bucket: BUCKET, path, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("auth_id", authId);

  if (updateError) {
    await supabase.storage.from(BUCKET).remove([path]);
    return { success: false, message: `Erro ao salvar arquivo: ${updateError.message}` };
  }

  if (existing?.path) await supabase.storage.from(BUCKET).remove([existing.path]);

  revalidatePath(`/pacientes/${authId}`);
  return { success: true, message: "PDF do Bodymetrix enviado." };
}

export async function getBodymetrixSignedUrlAction(path: string): Promise<{ url: string | null; message?: string }> {
  await assertPermission("avaliacoes.editar");
  const supabase = await createClient();
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60 * 10);
  if (error || !data) return { url: null, message: error?.message };
  return { url: data.signedUrl };
}

export async function disponibilizarAvaliacaoAction(
  id: string,
  authId: string,
  options: { enviarEmail: boolean },
): Promise<ActionResult> {
  await assertPermission("avaliacoes.editar");
  const supabase = await createClient();

  const { data: avaliacao, error: fetchError } = await supabase
    .from("avaliacoes_fisicas")
    .select("resumo_paciente")
    .eq("id", id)
    .eq("auth_id", authId)
    .maybeSingle();

  if (fetchError || !avaliacao) return { success: false, message: "Avaliação não encontrada." };
  if (!avaliacao.resumo_paciente?.trim()) {
    return { success: false, message: "Escreva o resumo para o paciente antes de disponibilizar." };
  }

  const agora = new Date().toISOString();

  const { error: upsertError } = await supabase.from("avaliacoes_resumos_paciente").upsert(
    { avaliacao_id: id, auth_id: authId, resumo: avaliacao.resumo_paciente, disponibilizado_em: agora },
    { onConflict: "avaliacao_id" },
  );
  if (upsertError) return { success: false, message: `Erro ao disponibilizar: ${upsertError.message}` };

  const { error: updateError } = await supabase
    .from("avaliacoes_fisicas")
    .update({ disponivel_paciente: true, disponibilizado_em: agora })
    .eq("id", id)
    .eq("auth_id", authId);
  if (updateError) {
    await supabase
      .from("avaliacoes_resumos_paciente")
      .delete()
      .eq("avaliacao_id", id)
      .eq("auth_id", authId);
    return { success: false, message: `Erro ao disponibilizar: ${updateError.message}` };
  }

  let emailMessage = "";
  if (options.enviarEmail) {
    const { data: paciente } = await supabase.from("pacientes").select("nome, email").eq("auth_id", authId).maybeSingle();
    if (paciente?.email) {
      const result = await sendEmail({
        to: paciente.email,
        subject: "Resumo da sua avaliação física",
        html: `<p>Olá, ${paciente.nome ?? ""}!</p><p>${avaliacao.resumo_paciente.replace(/\n/g, "<br/>")}</p>`,
      });
      emailMessage = result.ok ? " E-mail enviado." : ` E-mail não pôde ser enviado (${result.error}).`;
    } else {
      emailMessage = " Paciente sem e-mail cadastrado — não enviado.";
    }
  }

  revalidatePath(`/pacientes/${authId}`);
  return { success: true, message: `Avaliação disponibilizada para o paciente.${emailMessage}` };
}

export async function revogarAvaliacaoAction(id: string, authId: string): Promise<ActionResult> {
  await assertPermission("avaliacoes.editar");
  const supabase = await createClient();

  const { error: deleteError } = await supabase
    .from("avaliacoes_resumos_paciente")
    .delete()
    .eq("avaliacao_id", id)
    .eq("auth_id", authId);
  if (deleteError) return { success: false, message: `Erro ao revogar: ${deleteError.message}` };

  const { error: updateError } = await supabase
    .from("avaliacoes_fisicas")
    .update({ disponivel_paciente: false })
    .eq("id", id)
    .eq("auth_id", authId);
  if (updateError) return { success: false, message: `Erro ao revogar: ${updateError.message}` };

  revalidatePath(`/pacientes/${authId}`);
  return { success: true, message: "Acesso do paciente à avaliação revogado." };
}

export async function interpretarBodymetrixAction(id: string, authId: string): Promise<ActionResult> {
  await assertPermission("avaliacoes.editar");
  const supabase = await createClient();

  const { data: avaliacao, error: fetchError } = await supabase
    .from("avaliacoes_fisicas")
    .select("bucket, path, resumo_paciente")
    .eq("id", id)
    .eq("auth_id", authId)
    .maybeSingle();

  if (fetchError || !avaliacao?.path) {
    return { success: false, message: "Envie o PDF do Bodymetrix antes de interpretar." };
  }

  const { data: file, error: downloadError } = await supabase.storage.from(BUCKET).download(avaliacao.path);
  if (downloadError || !file) {
    return { success: false, message: `Erro ao ler o arquivo: ${downloadError?.message ?? "arquivo não encontrado"}` };
  }

  let resultado;
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    resultado = await interpretarBodymetrix(buffer.toString("base64"));
  } catch (err) {
    return { success: false, message: err instanceof Error ? err.message : "Erro ao interpretar o PDF." };
  }

  const { error: updateError } = await supabase
    .from("avaliacoes_fisicas")
    .update({
      interpretacao_ia: resultado.interpretacao_clinica,
      // não sobrescreve um resumo que o nutricionista já editou manualmente.
      resumo_paciente: avaliacao.resumo_paciente?.trim() ? avaliacao.resumo_paciente : resultado.resumo_paciente_sugerido,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("auth_id", authId);

  if (updateError) return { success: false, message: `Erro ao salvar interpretação: ${updateError.message}` };

  revalidatePath(`/pacientes/${authId}`);
  return { success: true, message: "Avaliação interpretada pela IA." };
}
