import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database.types";

export async function listPacientes(): Promise<Tables<"pacientes">[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("pacientes")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Erro ao carregar pacientes: ${error.message}`);
  return data ?? [];
}

export async function getPacienteStats() {
  const supabase = await createClient();
  const [{ count: ativos }, { count: inativos }] = await Promise.all([
    supabase.from("pacientes").select("*", { count: "exact", head: true }).eq("status", "ativo"),
    supabase.from("pacientes").select("*", { count: "exact", head: true }).eq("status", "inativo"),
  ]);

  return { ativos: ativos ?? 0, inativos: inativos ?? 0 };
}
