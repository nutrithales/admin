"use server";

import { revalidatePath } from "next/cache";
import { assertAdmin } from "@/lib/supabase/assert-admin";
import { assertAdminComNivel } from "@/lib/supabase/assert-permission";
import { createClient } from "@/lib/supabase/server";
import { syncPendencias } from "@/services/pendencias.actions";
import type { ActionResult } from "@/services/pacientes.actions";

export interface TarefaFormValues {
  titulo: string;
  descricao?: string;
  paciente_id?: string | null;
  prioridade: "baixa" | "media" | "alta";
  prazo?: string | null;
}

export async function createTarefaAction(values: TarefaFormValues): Promise<ActionResult> {
  const { adminId } = await assertAdminComNivel();
  if (!values.titulo.trim()) return { success: false, message: "Informe um título para a tarefa." };

  const supabase = await createClient();
  const { error } = await supabase.from("tarefas").insert({
    titulo: values.titulo.trim(),
    descricao: values.descricao?.trim() || null,
    paciente_id: values.paciente_id || null,
    prioridade: values.prioridade,
    prazo: values.prazo || null,
    criado_por: adminId,
  });
  if (error) return { success: false, message: `Erro ao criar tarefa: ${error.message}` };

  revalidatePath("/clara");
  return { success: true, message: "Tarefa criada." };
}

export async function concluirTarefaAction(id: string): Promise<ActionResult> {
  await assertAdmin();
  const supabase = await createClient();
  const { error } = await supabase
    .from("tarefas")
    .update({ status: "concluida", concluida_em: new Date().toISOString() })
    .eq("id", id);
  if (error) return { success: false, message: `Erro ao concluir tarefa: ${error.message}` };

  await syncPendencias();
  revalidatePath("/clara");
  return { success: true, message: "Tarefa concluída." };
}

export async function cancelarTarefaAction(id: string): Promise<ActionResult> {
  await assertAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("tarefas").update({ status: "cancelada" }).eq("id", id);
  if (error) return { success: false, message: `Erro ao cancelar tarefa: ${error.message}` };

  await syncPendencias();
  revalidatePath("/clara");
  return { success: true, message: "Tarefa cancelada." };
}
