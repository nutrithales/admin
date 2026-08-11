import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database.types";

export type PendenciaComPaciente = Tables<"pendencias"> & {
  paciente: Pick<Tables<"pacientes">, "id" | "nome" | "telefone"> | null;
  tarefa: Pick<Tables<"tarefas">, "id" | "titulo"> | null;
};

const PRIORIDADE_ORDEM: Record<string, number> = { alta: 0, media: 1, baixa: 2 };

/** Pendências ativas (pendentes ou adiadas), com o paciente/tarefa
 * relacionados já resolvidos — usado na central de pendências da Clara.
 * Chame `syncPendencias()` antes, para garantir que a lista reflete o
 * estado real do sistema. */
export async function listPendenciasAtivas(): Promise<PendenciaComPaciente[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("pendencias")
    .select("*, paciente:pacientes(id, nome, telefone), tarefa:tarefas(id, titulo)")
    .neq("status", "resolvida")
    .order("prazo", { ascending: true, nullsFirst: false });

  if (error) throw new Error(`Erro ao carregar pendências: ${error.message}`);
  return ((data ?? []) as unknown as PendenciaComPaciente[]).sort(
    (a, b) => (PRIORIDADE_ORDEM[a.prioridade] ?? 9) - (PRIORIDADE_ORDEM[b.prioridade] ?? 9),
  );
}

export async function listPendenciasPorPaciente(pacienteId: string): Promise<Tables<"pendencias">[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("pendencias")
    .select("*")
    .eq("paciente_id", pacienteId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Erro ao carregar pendências do paciente: ${error.message}`);
  return data ?? [];
}
