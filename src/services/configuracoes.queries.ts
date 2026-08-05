import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database.types";

export async function getConfiguracoes(): Promise<Tables<"configuracoes_consultorio"> | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("configuracoes_consultorio")
    .select("*")
    .eq("id", true)
    .maybeSingle();

  if (error) throw new Error(`Erro ao carregar configurações: ${error.message}`);
  return data;
}

export function getLogoPublicUrl(logoPath: string | null) {
  if (!logoPath) return null;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return null;
  return `${url}/storage/v1/object/public/config/${logoPath}`;
}
