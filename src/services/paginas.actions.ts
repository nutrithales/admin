"use server";

import { revalidatePath } from "next/cache";
import { assertAdmin } from "@/lib/supabase/assert-admin";
import { createClient } from "@/lib/supabase/server";
import { paginaSchema, type PaginaFormValues } from "@/utils/validation/pagina";
import type { ActionResult } from "@/services/pacientes.actions";

export async function createPaginaAction(values: PaginaFormValues): Promise<ActionResult> {
  await assertAdmin();
  const parsed = paginaSchema.safeParse(values);
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const supabase = await createClient();
  const { paciente_id, url, ...rest } = parsed.data;
  const { error } = await supabase
    .from("paginas_paciente")
    .insert({ ...rest, user_id: paciente_id, url_pagina: url });
  if (error) return { success: false, message: `Erro ao criar página: ${error.message}` };

  revalidatePath("/paginas-personalizadas");
  return { success: true, message: "Página personalizada criada." };
}

export async function updatePaginaAction(
  id: string,
  values: PaginaFormValues,
): Promise<ActionResult> {
  await assertAdmin();
  const parsed = paginaSchema.safeParse(values);
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const supabase = await createClient();
  const { paciente_id, url, ...rest } = parsed.data;
  const { error } = await supabase
    .from("paginas_paciente")
    .update({ ...rest, user_id: paciente_id, url_pagina: url })
    .eq("id", id);
  if (error) return { success: false, message: `Erro ao atualizar página: ${error.message}` };

  revalidatePath("/paginas-personalizadas");
  return { success: true, message: "Página atualizada." };
}

export async function deletePaginaAction(id: string): Promise<ActionResult> {
  await assertAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("paginas_paciente").delete().eq("id", id);
  if (error) return { success: false, message: `Erro ao excluir página: ${error.message}` };

  revalidatePath("/paginas-personalizadas");
  return { success: true, message: "Página excluída." };
}

export async function setPaginaAtivaAction(id: string, ativo: boolean): Promise<ActionResult> {
  await assertAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("paginas_paciente").update({ ativo }).eq("id", id);
  if (error) return { success: false, message: `Erro ao atualizar página: ${error.message}` };

  revalidatePath("/paginas-personalizadas");
  return { success: true, message: ativo ? "Página ativada." : "Página desativada." };
}
