import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database.types";

export async function listMensagensModelos(): Promise<Tables<"mensagens_modelos">[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("mensagens_modelos")
    .select("*")
    .order("titulo", { ascending: true });

  if (error) throw new Error(`Erro ao carregar modelos de mensagem: ${error.message}`);
  return data ?? [];
}
