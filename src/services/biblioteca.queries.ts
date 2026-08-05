import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database.types";

export async function listBiblioteca(): Promise<Tables<"biblioteca">[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("biblioteca")
    .select("*")
    .order("ordem", { ascending: true });

  if (error) throw new Error(`Erro ao carregar biblioteca: ${error.message}`);
  return data ?? [];
}

/** Categories aren't a separate table — `categoria` is free text on
 * `biblioteca` itself — so this just collects the distinct values already
 * in use, to suggest via a datalist rather than a hard-coded list. */
export async function listCategoriasSugeridas(): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("biblioteca")
    .select("categoria")
    .not("categoria", "is", null);

  return Array.from(new Set((data ?? []).map((d) => d.categoria).filter((c): c is string => !!c)));
}
