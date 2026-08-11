"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { FLOW_STAGES } from "@/lib/fluxo/stages";
import { assertAdmin } from "@/lib/supabase/assert-admin";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/services/pacientes.actions";

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
  await assertAdmin();
  const parsed = updateSchema.safeParse(values);
  if (!parsed.success || !z.string().uuid().safeParse(id).success) {
    return { success: false, message: "Atualização inválida." };
  }

  const supabase = await createClient();
  const data = parsed.data;
  const { error } = await supabase.from("pacientes").update({
    ...(data.etapa !== undefined ? { fluxo_etapa: data.etapa } : {}),
    ...(data.urgente !== undefined ? { fluxo_urgente: data.urgente } : {}),
    ...(data.observacoes !== undefined ? { fluxo_observacoes: data.observacoes || null } : {}),
    ...(data.proximaAcaoEm !== undefined ? { fluxo_proxima_acao_em: data.proximaAcaoEm } : {}),
    fluxo_updated_at: new Date().toISOString(),
  }).eq("id", id);

  if (error) return { success: false, message: `Erro ao atualizar fluxo: ${error.message}` };
  revalidatePath("/fluxo");
  return { success: true, message: "Fluxo atualizado." };
}
