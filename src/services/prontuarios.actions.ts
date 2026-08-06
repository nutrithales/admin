"use server";

import { revalidatePath } from "next/cache";
import { assertAdmin } from "@/lib/supabase/assert-admin";
import { createClient } from "@/lib/supabase/server";
import { prontuarioSchema, type ProntuarioFormValues } from "@/utils/validation/prontuario";
import type { ActionResult } from "@/services/pacientes.actions";

/** Um prontuário por consulta — grava sempre por upsert (nunca há mais de
 * uma linha por `consulta_id`, graças ao `unique` da coluna). Nunca fica
 * visível ao paciente (sem policy de leitura na tabela). */
export async function upsertProntuarioAction(
  consultaId: string,
  pacienteId: string,
  values: ProntuarioFormValues,
): Promise<ActionResult> {
  await assertAdmin();
  const parsed = prontuarioSchema.safeParse(values);
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const data = parsed.data;
  const supabase = await createClient();

  const { error } = await supabase.from("consulta_prontuarios").upsert(
    {
      consulta_id: consultaId,
      prontuario: data.prontuario || null,
      resumo_granola: data.resumo_granola || null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "consulta_id" },
  );

  if (error) return { success: false, message: `Erro ao salvar prontuário: ${error.message}` };

  revalidatePath(`/pacientes/${pacienteId}`);
  return { success: true, message: "Prontuário salvo." };
}
