import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database.types";

export type TarefaComPaciente = Tables<"tarefas"> & {
  paciente: Pick<Tables<"pacientes">, "id" | "nome"> | null;
};

export async function listTarefas(): Promise<TarefaComPaciente[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tarefas")
    .select("*, paciente:pacientes(id, nome)")
    .order("status", { ascending: true })
    .order("prazo", { ascending: true, nullsFirst: false });

  if (error) throw new Error(`Erro ao carregar tarefas: ${error.message}`);
  return (data ?? []) as unknown as TarefaComPaciente[];
}

export async function listTarefasPendentes(): Promise<TarefaComPaciente[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tarefas")
    .select("*, paciente:pacientes(id, nome)")
    .eq("status", "pendente")
    .order("prazo", { ascending: true, nullsFirst: false });

  if (error) throw new Error(`Erro ao carregar tarefas: ${error.message}`);
  return (data ?? []) as unknown as TarefaComPaciente[];
}
