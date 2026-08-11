"use server";

import { revalidatePath } from "next/cache";
import { assertPermission } from "@/lib/supabase/assert-permission";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/services/pacientes.actions";
import type { Database } from "@/types/database.types";

type ConfiguracoesUpdate = Database["public"]["Tables"]["configuracoes_consultorio"]["Update"];

export async function saveConfiguracoesAction(formData: FormData): Promise<ActionResult> {
  await assertPermission("configuracoes.editar");
  const supabase = await createClient();

  const nome_consultorio = String(formData.get("nome_consultorio") || "").trim() || null;
  const endereco = String(formData.get("endereco") || "").trim() || null;
  const whatsapp = String(formData.get("whatsapp") || "").trim() || null;
  const email = String(formData.get("email") || "").trim() || null;
  const logo = formData.get("logo") as File | null;

  const redes_sociais = {
    instagram: String(formData.get("instagram") || "").trim() || undefined,
    facebook: String(formData.get("facebook") || "").trim() || undefined,
    tiktok: String(formData.get("tiktok") || "").trim() || undefined,
    youtube: String(formData.get("youtube") || "").trim() || undefined,
  };

  const payload: ConfiguracoesUpdate = {
    nome_consultorio,
    endereco,
    whatsapp,
    email,
    redes_sociais,
  };

  if (logo && logo.size > 0) {
    if (!logo.type.startsWith("image/")) {
      return { success: false, message: "Envie um arquivo de imagem para o logo." };
    }
    const ext = logo.name.split(".").pop() || "png";
    const path = `logo-${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("config")
      .upload(path, logo, { upsert: true, contentType: logo.type });
    if (uploadError) {
      return { success: false, message: `Erro ao enviar logo: ${uploadError.message}` };
    }
    payload.logo_path = path;
  }

  const { error } = await supabase
    .from("configuracoes_consultorio")
    .update(payload)
    .eq("id", true);

  if (error) return { success: false, message: `Erro ao salvar configurações: ${error.message}` };

  revalidatePath("/configuracoes");
  return { success: true, message: "Configurações salvas com sucesso." };
}
