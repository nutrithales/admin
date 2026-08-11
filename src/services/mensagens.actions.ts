"use server";

import { revalidatePath } from "next/cache";
import { assertPermission } from "@/lib/supabase/assert-permission";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/services/pacientes.actions";

export async function updateMensagemModeloAction(
  id: string,
  values: { titulo: string; corpo: string; ativo: boolean },
): Promise<ActionResult> {
  await assertPermission("mensagens_modelos.editar");
  if (!values.titulo.trim() || !values.corpo.trim()) {
    return { success: false, message: "Preencha título e corpo da mensagem." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("mensagens_modelos")
    .update({
      titulo: values.titulo.trim(),
      corpo: values.corpo.trim(),
      ativo: values.ativo,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) return { success: false, message: `Erro ao salvar modelo: ${error.message}` };

  revalidatePath("/clara");
  revalidatePath("/configuracoes");
  return { success: true, message: "Modelo de mensagem atualizado." };
}
