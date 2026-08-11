"use server";

import { revalidatePath } from "next/cache";
import { assertAdmin } from "@/lib/supabase/assert-admin";
import { assertAdminComNivel } from "@/lib/supabase/assert-permission";
import { createClient } from "@/lib/supabase/server";
import { syncPendencias } from "@/services/pendencias.actions";
import { listHistoricoFluxo } from "@/services/fluxo.queries";
import type { ActionResult } from "@/services/pacientes.actions";
import type { FluxoEstagio } from "@/lib/clara/fluxo";
import type { Tables } from "@/types/database.types";

export async function moverPacienteFluxoAction(
  pacienteId: string,
  paraEstagio: FluxoEstagio,
  observacao?: string,
): Promise<ActionResult> {
  const { adminId } = await assertAdminComNivel();
  const supabase = await createClient();

  const { data: paciente } = await supabase
    .from("pacientes")
    .select("fluxo_estagio")
    .eq("id", pacienteId)
    .maybeSingle();
  if (!paciente) return { success: false, message: "Paciente não encontrado." };
  if (paciente.fluxo_estagio === paraEstagio) {
    return { success: true, message: "Paciente já está nessa etapa." };
  }

  const { error: updateError } = await supabase
    .from("pacientes")
    .update({ fluxo_estagio: paraEstagio })
    .eq("id", pacienteId);
  if (updateError) return { success: false, message: `Erro ao mover paciente: ${updateError.message}` };

  const { error: historicoError } = await supabase.from("fluxo_movimentacoes").insert({
    paciente_id: pacienteId,
    de_estagio: paciente.fluxo_estagio,
    para_estagio: paraEstagio,
    observacao: observacao || null,
    admin_id: adminId,
  });
  if (historicoError) {
    return { success: false, message: `Paciente movido, mas o histórico falhou: ${historicoError.message}` };
  }

  await syncPendencias();
  revalidatePath("/fluxo");
  revalidatePath("/clara");
  revalidatePath("/pacientes");
  return { success: true, message: "Paciente movido no Fluxo." };
}

export async function getHistoricoFluxoAction(pacienteId: string): Promise<Tables<"fluxo_movimentacoes">[]> {
  await assertAdmin();
  return listHistoricoFluxo(pacienteId);
}
