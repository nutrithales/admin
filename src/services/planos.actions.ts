"use server";

import { revalidatePath } from "next/cache";
import { assertAdmin } from "@/lib/supabase/assert-admin";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/services/pacientes.actions";

const BUCKET = "planos";
const MAX_SIZE_BYTES = 20 * 1024 * 1024; // 20MB

function buildPath(pacienteId: string, file: File) {
  const ext = file.name.split(".").pop() || "pdf";
  return `${pacienteId}/${crypto.randomUUID()}.${ext}`;
}

export async function createPlanoAlimentarAction(formData: FormData): Promise<ActionResult> {
  await assertAdmin();

  const pacienteId = String(formData.get("paciente_id") || "");
  const titulo = String(formData.get("titulo") || "Plano alimentar").trim();
  const file = formData.get("arquivo") as File | null;

  if (!pacienteId) return { success: false, message: "Selecione um paciente." };
  if (!file || file.size === 0) return { success: false, message: "Selecione um arquivo PDF." };
  if (file.type !== "application/pdf") return { success: false, message: "Envie um arquivo PDF." };
  if (file.size > MAX_SIZE_BYTES) return { success: false, message: "O arquivo deve ter até 20MB." };

  const supabase = await createClient();
  const path = buildPath(pacienteId, file);

  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: "application/pdf",
  });
  if (uploadError) {
    return { success: false, message: `Erro ao enviar arquivo: ${uploadError.message}` };
  }

  const { error: insertError } = await supabase.from("planos_alimentares").insert({
    auth_id: pacienteId,
    titulo,
    tipo: "pdf",
    bucket: BUCKET,
    path,
    ativo: true,
    data_envio: new Date().toISOString(),
  });

  if (insertError) {
    await supabase.storage.from(BUCKET).remove([path]);
    return { success: false, message: `Erro ao salvar plano: ${insertError.message}` };
  }

  revalidatePath("/planos-alimentares");
  return { success: true, message: "Plano alimentar enviado com sucesso." };
}

export async function replacePlanoAlimentarPdfAction(
  id: string,
  formData: FormData,
): Promise<ActionResult> {
  await assertAdmin();
  const file = formData.get("arquivo") as File | null;
  if (!file || file.size === 0) return { success: false, message: "Selecione um arquivo PDF." };
  if (file.type !== "application/pdf") return { success: false, message: "Envie um arquivo PDF." };
  if (file.size > MAX_SIZE_BYTES) return { success: false, message: "O arquivo deve ter até 20MB." };

  const supabase = await createClient();
  const { data: existing, error: fetchError } = await supabase
    .from("planos_alimentares")
    .select("auth_id, path")
    .eq("id", id)
    .single();

  if (fetchError || !existing) return { success: false, message: "Plano não encontrado." };

  const newPath = buildPath(existing.auth_id, file);
  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(newPath, file, {
    contentType: "application/pdf",
  });
  if (uploadError) return { success: false, message: `Erro ao enviar arquivo: ${uploadError.message}` };

  const { error: updateError } = await supabase
    .from("planos_alimentares")
    .update({ path: newPath })
    .eq("id", id);

  if (updateError) {
    await supabase.storage.from(BUCKET).remove([newPath]);
    return { success: false, message: `Erro ao atualizar plano: ${updateError.message}` };
  }

  if (existing.path) {
    await supabase.storage.from(BUCKET).remove([existing.path]);
  }

  revalidatePath("/planos-alimentares");
  return { success: true, message: "PDF substituído com sucesso." };
}

export async function deletePlanoAlimentarAction(id: string): Promise<ActionResult> {
  await assertAdmin();
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("planos_alimentares")
    .select("path")
    .eq("id", id)
    .single();

  const { error } = await supabase.from("planos_alimentares").delete().eq("id", id);
  if (error) return { success: false, message: `Erro ao excluir plano: ${error.message}` };

  if (existing?.path) {
    await supabase.storage.from(BUCKET).remove([existing.path]);
  }

  revalidatePath("/planos-alimentares");
  return { success: true, message: "Plano alimentar excluído." };
}

export async function getPlanoSignedUrlAction(
  path: string,
): Promise<{ url: string | null; message?: string }> {
  await assertAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60 * 10);
  if (error || !data) return { url: null, message: error?.message };
  return { url: data.signedUrl };
}
