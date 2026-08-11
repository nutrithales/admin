"use server";

import { revalidatePath } from "next/cache";
import { assertAdminComNivel } from "@/lib/supabase/assert-permission";
import { createClient } from "@/lib/supabase/server";
import { syncPendencias } from "@/services/pendencias.actions";
import type { ActionResult } from "@/services/pacientes.actions";

export interface PagamentoFormValues {
  paciente_id: string;
  plano?: string;
  valor?: number;
  forma_pagamento?: string;
  vencimento?: string;
  observacoes?: string;
}

export async function registrarPagamentoAction(values: PagamentoFormValues): Promise<ActionResult> {
  const { adminId } = await assertAdminComNivel();
  if (!values.paciente_id) return { success: false, message: "Selecione um paciente." };

  const supabase = await createClient();
  const { error } = await supabase.from("pagamentos").insert({
    paciente_id: values.paciente_id,
    plano: values.plano || null,
    valor: values.valor ?? null,
    forma_pagamento: values.forma_pagamento || null,
    vencimento: values.vencimento || null,
    observacoes: values.observacoes || null,
    status: "pendente",
    criado_por: adminId,
  });
  if (error) return { success: false, message: `Erro ao registrar pagamento: ${error.message}` };

  await syncPendencias();
  revalidatePath("/clara");
  revalidatePath("/pacientes");
  return { success: true, message: "Pagamento registrado." };
}

export async function marcarPagamentoAction(
  id: string,
  status: "pago" | "atrasado" | "cancelado",
): Promise<ActionResult> {
  await assertAdminComNivel();
  const supabase = await createClient();
  const { error } = await supabase
    .from("pagamentos")
    .update({ status, pago_em: status === "pago" ? new Date().toISOString() : null })
    .eq("id", id);
  if (error) return { success: false, message: `Erro ao atualizar pagamento: ${error.message}` };

  await syncPendencias();
  revalidatePath("/clara");
  revalidatePath("/pacientes");
  return { success: true, message: "Pagamento atualizado." };
}
