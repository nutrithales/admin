import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database.types";

export async function listAvaliacoesFisicas(authId: string): Promise<Tables<"avaliacoes_fisicas">[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("avaliacoes_fisicas")
    .select("*")
    .eq("auth_id", authId)
    .order("data", { ascending: false });

  if (error) throw new Error(`Erro ao carregar avaliações físicas: ${error.message}`);
  return data ?? [];
}

export async function getAvaliacaoFisica(id: string): Promise<Tables<"avaliacoes_fisicas"> | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("avaliacoes_fisicas").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(`Erro ao carregar avaliação física: ${error.message}`);
  return data;
}
