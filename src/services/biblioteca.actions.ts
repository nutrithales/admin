"use server";

import { revalidatePath } from "next/cache";
import { assertAdmin } from "@/lib/supabase/assert-admin";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/services/pacientes.actions";
import type { Database } from "@/types/database.types";

type BibliotecaUpsert = Database["public"]["Tables"]["biblioteca"]["Insert"];

const BUCKET = "biblioteca";
const MAX_SIZE_BYTES = 200 * 1024 * 1024; // 200MB (videos)

function buildPath(prefix: string, file: File) {
  const ext = file.name.split(".").pop() || "bin";
  return `${prefix}/${crypto.randomUUID()}.${ext}`;
}

export async function saveConteudoBibliotecaAction(
  id: string | null,
  formData: FormData,
): Promise<ActionResult> {
  await assertAdmin();
  const supabase = await createClient();

  const titulo = String(formData.get("titulo") || "").trim();
  const descricao = String(formData.get("descricao") || "").trim() || null;
  const categoria = String(formData.get("categoria") || "").trim() || null;
  const tipo = String(formData.get("tipo") || "pdf");
  const url = String(formData.get("url") || "").trim() || null;
  const ordem = Number(formData.get("ordem") || 0);
  const ativo = formData.get("ativo") === "1";
  const arquivo = formData.get("arquivo") as File | null;
  const thumbnail = formData.get("thumbnail") as File | null;

  if (!titulo) return { success: false, message: "Informe o título." };
  if (tipo === "link" && !url) return { success: false, message: "Informe a URL do conteúdo." };
  if ((tipo === "pdf" || tipo === "video") && !arquivo?.size && !id) {
    return { success: false, message: "Envie um arquivo para este tipo de conteúdo." };
  }

  let path: string | undefined;
  let thumbnailPath: string | undefined;

  if (arquivo && arquivo.size > 0) {
    if (arquivo.size > MAX_SIZE_BYTES) return { success: false, message: "Arquivo muito grande (máx. 200MB)." };
    path = buildPath("conteudo", arquivo);
    const { error } = await supabase.storage.from(BUCKET).upload(path, arquivo);
    if (error) return { success: false, message: `Erro ao enviar arquivo: ${error.message}` };
  }

  if (thumbnail && thumbnail.size > 0) {
    thumbnailPath = buildPath("thumbs", thumbnail);
    const { error } = await supabase.storage.from(BUCKET).upload(thumbnailPath, thumbnail);
    if (error) return { success: false, message: `Erro ao enviar thumbnail: ${error.message}` };
  }

  const payload: BibliotecaUpsert = {
    titulo,
    descricao,
    categoria,
    tipo,
    url: tipo === "link" ? url : null,
    ordem,
    ativo,
  };
  if (path) {
    payload.path = path;
    payload.bucket = BUCKET;
  }
  if (thumbnailPath) payload.thumbnail_path = thumbnailPath;

  if (id) {
    const { error } = await supabase.from("biblioteca").update(payload).eq("id", id);
    if (error) return { success: false, message: `Erro ao atualizar conteúdo: ${error.message}` };
  } else {
    const { error } = await supabase.from("biblioteca").insert(payload);
    if (error) return { success: false, message: `Erro ao criar conteúdo: ${error.message}` };
  }

  revalidatePath("/biblioteca");
  return { success: true, message: id ? "Conteúdo atualizado." : "Conteúdo adicionado à biblioteca." };
}

export async function deleteConteudoBibliotecaAction(id: string): Promise<ActionResult> {
  await assertAdmin();
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("biblioteca")
    .select("path, thumbnail_path")
    .eq("id", id)
    .single();

  const { error } = await supabase.from("biblioteca").delete().eq("id", id);
  if (error) return { success: false, message: `Erro ao excluir conteúdo: ${error.message}` };

  const toRemove = [existing?.path, existing?.thumbnail_path].filter((p): p is string => !!p);
  if (toRemove.length) await supabase.storage.from(BUCKET).remove(toRemove);

  revalidatePath("/biblioteca");
  return { success: true, message: "Conteúdo excluído." };
}

export async function setConteudoAtivoAction(id: string, ativo: boolean): Promise<ActionResult> {
  await assertAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("biblioteca").update({ ativo }).eq("id", id);
  if (error) return { success: false, message: `Erro: ${error.message}` };

  revalidatePath("/biblioteca");
  return { success: true, message: ativo ? "Conteúdo ativado." : "Conteúdo desativado." };
}

export async function getBibliotecaSignedUrlAction(
  path: string,
): Promise<{ url: string | null; message?: string }> {
  await assertAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60 * 10);
  if (error || !data) return { url: null, message: error?.message };
  return { url: data.signedUrl };
}
