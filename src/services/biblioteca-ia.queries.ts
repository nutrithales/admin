import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database.types";

export type DocumentoBibliotecaComPaciente = Tables<"documentos_biblioteca"> & {
  paciente_nome: string | null;
};

export async function listDocumentosBiblioteca(limit = 50): Promise<DocumentoBibliotecaComPaciente[]> {
  const supabase = await createClient();
  const [{ data: documentos, error }, { data: pacientes }] = await Promise.all([
    supabase.from("documentos_biblioteca").select("*").order("created_at", { ascending: false }).limit(limit),
    supabase.from("pacientes").select("auth_id, nome"),
  ]);

  if (error) throw new Error(`Erro ao carregar documentos: ${error.message}`);

  const nomePorAuthId = new Map((pacientes ?? []).map((p) => [p.auth_id, p.nome]));
  return (documentos ?? []).map((d) => ({ ...d, paciente_nome: d.auth_id ? (nomePorAuthId.get(d.auth_id) ?? null) : null }));
}

export interface PendentesRevisao {
  alimentos: Pick<Tables<"alimentos">, "id" | "nome" | "categoria">[];
  receitas: Pick<Tables<"receitas">, "id" | "nome">[];
}

export async function listPendentesRevisao(): Promise<PendentesRevisao> {
  const supabase = await createClient();
  const [{ data: alimentos }, { data: receitas }] = await Promise.all([
    supabase.from("alimentos").select("id, nome, categoria").eq("revisado_manualmente", false).order("nome"),
    supabase.from("receitas").select("id, nome").eq("revisado_manualmente", false).order("nome"),
  ]);

  return { alimentos: alimentos ?? [], receitas: receitas ?? [] };
}
