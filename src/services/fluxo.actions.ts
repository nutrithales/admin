"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { FLOW_STAGES } from "@/lib/fluxo/stages";
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

export async function updateFluxoPacienteAction(id: string, values: z.input<typeof updateSchema>): Promise<ActionResult> {
  const { adminId } = await assertAdminComNivel();
  const parsed = updateSchema.safeParse(values);
  if (!parsed.success || !z.string().uuid().safeParse(id).success) return { success: false, message: "Atualização inválida." };

  const supabase = await createClient();
  const db = supabase as any;
  const data = parsed.data;
  const { data: paciente } = await db
    .from("pacientes")
    .select("fluxo_etapa,plano_entregue_em,reconsulta_intervalo_dias")
    .eq("id", id)
    .maybeSingle();
  if (!paciente) return { success: false, message: "Paciente não encontrado." };

  const etapaMudou = data.etapa !== undefined && data.etapa !== paciente.fluxo_etapa;
  const agoraDate = new Date();
  const agora = agoraDate.toISOString();
  const marcouEntrega = etapaMudou && paciente.fluxo_etapa === "06_plano_elaboracao" && data.etapa === "07_acompanhamento_ativo";
  const intervalo = Number(paciente.reconsulta_intervalo_dias) || 45;
  const reconsultaPrevista = new Date(agoraDate);
  reconsultaPrevista.setDate(reconsultaPrevista.getDate() + intervalo);
  const proximaAcao = data.proximaAcaoEm !== undefined ? data.proximaAcaoEm : etapaMudou ? null : undefined;

  const { error } = await db.from("pacientes").update({
    ...(data.etapa !== undefined ? { fluxo_etapa: data.etapa } : {}),
    ...(data.urgente !== undefined ? { fluxo_urgente: data.urgente } : {}),
    ...(data.observacoes !== undefined ? { fluxo_observacoes: data.observacoes || null } : {}),
    ...(proximaAcao !== undefined ? { fluxo_proxima_acao_em: proximaAcao } : {}),
    ...(marcouEntrega
      ? {
          plano_entregue_em: agora,
          proxima_reconsulta_prevista: reconsultaPrevista.toISOString(),
          reconsulta_intervalo_dias: intervalo,
        }
      : {}),
    fluxo_updated_at: agora,
  }).eq("id", id);

  if (error) return { success: false, message: `Erro ao atualizar fluxo: ${error.message}` };

  if (etapaMudou) {
    await db.from("fluxo_movimentacoes").insert({
      paciente_id: id,
      de_etapa: paciente.fluxo_etapa,
      para_etapa: data.etapa!,
      admin_id: adminId,
      observacao: marcouEntrega
        ? `Plano entregue. Marc.ia agenda contatos D+3/D+7 e reconsulta prevista em ${intervalo} dias.`
        : null,
    });
  }

  await syncPendencias();
  revalidatePath("/fluxo");
  revalidatePath("/clara");
  revalidatePath("/pacientes");
  return {
    success: true,
    message: marcouEntrega
      ? `Plano entregue. Reconsulta prevista para ${reconsultaPrevista.toLocaleDateString("pt-BR")}.`
      : "Fluxo atualizado.",
  };
}

export async function getHistoricoFluxoAction(pacienteId: string): Promise<Tables<"fluxo_movimentacoes">[]> {
  await assertAdmin();
  return listHistoricoFluxo(pacienteId);
}
