"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { FLOW_STAGES } from "@/lib/fluxo/stages";
import { automaticNextActionForStage } from "@/lib/fluxo/automation";
import { assertAdmin } from "@/lib/supabase/assert-admin";
import { assertAdminComNivel } from "@/lib/supabase/assert-permission";
import { createClient } from "@/lib/supabase/server";
import { syncPendencias } from "@/services/pendencias.actions";
import { listHistoricoFluxo } from "@/services/fluxo.queries";
import type { ActionResult } from "@/services/pacientes.actions";
import type { Tables } from "@/types/database.types";

const stageKeys = FLOW_STAGES.map((stage) => stage.key) as [string, ...string[]];
const updateSchema = z.object({
  etapa: z.enum(stageKeys).optional(),
  urgente: z.boolean().optional(),
  observacoes: z.string().trim().max(3000).nullable().optional(),
  proximaAcaoEm: z.string().datetime().nullable().optional(),
});

export async function updateFluxoPacienteAction(
  id: string,
  values: z.input<typeof updateSchema>,
): Promise<ActionResult> {
  const { adminId } = await assertAdminComNivel();
  const parsed = updateSchema.safeParse(values);
  if (!parsed.success || !z.string().uuid().safeParse(id).success) {
    return { success: false, message: "Atualização inválida." };
  }

  const supabase = await createClient();
  const data = parsed.data;
  const { data: paciente } = await supabase.from("pacientes").select("fluxo_etapa").eq("id", id).maybeSingle();
  if (!paciente) return { success: false, message: "Paciente não encontrado." };

  const etapaMudou = data.etapa !== undefined && data.etapa !== paciente.fluxo_etapa;
  const proximaAcao = data.proximaAcaoEm !== undefined
    ? data.proximaAcaoEm
    : etapaMudou
      ? automaticNextActionForStage(data.etapa)
      : undefined;

  const { error } = await supabase.from("pacientes").update({
    ...(data.etapa !== undefined ? { fluxo_etapa: data.etapa } : {}),
    ...(data.urgente !== undefined ? { fluxo_urgente: data.urgente } : {}),
    ...(data.observacoes !== undefined ? { fluxo_observacoes: data.observacoes || null } : {}),
    ...(proximaAcao !== undefined ? { fluxo_proxima_acao_em: proximaAcao } : {}),
    fluxo_updated_at: new Date().toISOString(),
  }).eq("id", id);

  if (error) return { success: false, message: `Erro ao atualizar fluxo: ${error.message}` };

  if (etapaMudou) {
    await supabase.from("fluxo_movimentacoes").insert({
      paciente_id: id,
      de_etapa: paciente.fluxo_etapa,
      para_etapa: data.etapa!,
      admin_id: adminId,
    });
  }

  await syncPendencias();
  revalidatePath("/fluxo");
  revalidatePath("/clara");
  revalidatePath("/pacientes");
  return { success: true, message: "Fluxo atualizado." };
}

export async function getHistoricoFluxoAction(pacienteId: string): Promise<Tables<"fluxo_movimentacoes">[]> {
  await assertAdmin();
  return listHistoricoFluxo(pacienteId);
}
