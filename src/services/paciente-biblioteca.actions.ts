"use server";

import { createClient } from "@/lib/supabase/server";

const BUCKET = "biblioteca";

export async function getPacienteBibliotecaSignedUrlAction(
  conteudoId: string,
): Promise<{ url: string | null; message?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { url: null, message: "Sessão expirada. Entre novamente." };

  const { data: paciente } = await supabase
    .from("pacientes")
    .select("status")
    .eq("auth_id", user.id)
    .maybeSingle();

  if (!paciente || String(paciente.status || "").toLowerCase() !== "ativo") {
    return { url: null, message: "Este conteúdo está disponível somente para pacientes ativos." };
  }

  const { data: conteudo, error } = await supabase
    .from("biblioteca")
    .select("tipo,url,path,bucket,ativo")
    .eq("id", conteudoId)
    .eq("ativo", true)
    .maybeSingle();

  if (error || !conteudo) return { url: null, message: "Material não encontrado ou indisponível." };

  if (conteudo.tipo === "link") {
    return conteudo.url
      ? { url: conteudo.url }
      : { url: null, message: "Este material não possui um link válido." };
  }

  if (!conteudo.path) return { url: null, message: "Arquivo não disponível." };

  const bucket = conteudo.bucket || BUCKET;
  const { data, error: signError } = await supabase.storage.from(bucket).createSignedUrl(conteudo.path, 60 * 10);

  if (signError || !data) return { url: null, message: signError?.message || "Não foi possível abrir o arquivo." };
  return { url: data.signedUrl };
}
