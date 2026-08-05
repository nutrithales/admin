import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database.types";

export type PaginaPacienteComPaciente = Tables<"paginas_paciente"> & {
  paciente: Pick<Tables<"pacientes">, "id" | "nome"> | null;
};

export async function listPaginasPaciente(): Promise<PaginaPacienteComPaciente[]> {
  const supabase = await createClient();
  const [{ data: paginas, error }, { data: pacientes }] = await Promise.all([
    supabase.from("paginas_paciente").select("*").order("ordem", { ascending: true }),
    supabase.from("pacientes").select("id, auth_id, nome"),
  ]);

  if (error) throw new Error(`Erro ao carregar páginas: ${error.message}`);

  const porAuthId = new Map((pacientes ?? []).map((p) => [p.auth_id, p]));
  return (paginas ?? []).map((pagina) => ({
    ...pagina,
    paciente: porAuthId.get(pagina.user_id) ?? null,
  }));
}

/** For select inputs: `id` here is the patient's auth user id (`auth_id`),
 * since paginas_paciente/planos_alimentares/consultas/checkins all link to
 * the patient via that column rather than `pacientes.id`. */
export async function listPacientesForSelect() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("pacientes")
    .select("auth_id, nome")
    .order("nome", { ascending: true });
  return (data ?? []).map((p) => ({ id: p.auth_id, nome: p.nome ?? "(sem nome)" }));
}
