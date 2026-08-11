"use server";

import { revalidatePath } from "next/cache";
import { assertAdmin } from "@/lib/supabase/assert-admin";
import { assertAdminComNivel } from "@/lib/supabase/assert-permission";
import { createClient } from "@/lib/supabase/server";
import { syncPendencias } from "@/services/pendencias.actions";
import { listHistoricoFluxo } from "@/services/fluxo.queries";
import type { ActionResult } from "@/services/pacientes.actions";
import type { FluxoEtapa } from "@/lib/clara/fluxo";
import type { Tables } from "@/types/database.types";

export interface MoverFluxoOpcoes {
  observacaoMovimentacao?: string;
  urgente?: boolean;
  proximaAcaoEm?: string | null;
  observacoes?: string;
}

/** Move um paciente de etapa no Fluxo (sistema já existente:
 * `pacientes.fluxo_etapa`) e registra o histórico em
 * `fluxo_movimentacoes`. Também permite atualizar, na mesma ação,
 * `fluxo_urgente`, `fluxo_proxima_acao_em` e `fluxo_observacoes`. */
export async function moverPacienteFluxoAction(
  pacienteId: string,
  paraEtapa: FluxoEtapa,
  opcoes: MoverFluxoOpcoes = {},
): Promise<ActionResult> {
  const { adminId } = await assertAdminComNivel();
  const supabase = await createClient();

  const { data: paciente } = await supabase
    .from("pacientes")
    .select("fluxo_etapa")
    .eq("id", pacienteId)
    .maybeSingle();
  if (!paciente) return { success: false, message: "Paciente não encontrado." };

  const mudouEtapa = paciente.fluxo_etapa !== paraEtapa;

  const { error: updateError } = await supabase
    .from("pacientes")
    .update({
      fluxo_etapa: paraEtapa,
      fluxo_updated_at: new Date().toISOString(),
      ...(opcoes.urgente !== undefined ? { fluxo_urgente: opcoes.urgente } : {}),
      ...(opcoes.proximaAcaoEm !== undefined ? { fluxo_proxima_acao_em: opcoes.proximaAcaoEm || null } : {}),
      ...(opcoes.observacoes !== undefined ? { fluxo_observacoes: opcoes.observacoes || null } : {}),
    })
    .eq("id", pacienteId);
  if (updateError) return { success: false, message: `Erro ao mover paciente: ${updateError.message}` };

  if (mudouEtapa) {
    const { error: historicoError } = await supabase.from("fluxo_movimentacoes").insert({
      paciente_id: pacienteId,
      de_etapa: paciente.fluxo_etapa,
      para_etapa: paraEtapa,
      observacao: opcoes.observacaoMovimentacao || null,
      admin_id: adminId,
    });
    if (historicoError) {
      return { success: false, message: `Paciente atualizado, mas o histórico falhou: ${historicoError.message}` };
    }
  }

  await syncPendencias();
  revalidatePath("/fluxo");
  revalidatePath("/clara");
  revalidatePath("/pacientes");
  return { success: true, message: mudouEtapa ? "Paciente movido no Fluxo." : "Fluxo atualizado." };
}

export async function getHistoricoFluxoAction(pacienteId: string): Promise<Tables<"fluxo_movimentacoes">[]> {
  await assertAdmin();
  return listHistoricoFluxo(pacienteId);
}
