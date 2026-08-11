"use server";

import { revalidatePath } from "next/cache";
import { assertAdmin } from "@/lib/supabase/assert-admin";
import { createClient } from "@/lib/supabase/server";
import { syncPendencias } from "@/services/pendencias.actions";
import type { ActionResult } from "@/services/pacientes.actions";

/** Registra o envio de um check-in a um paciente (a mensagem em si é
 * preparada separadamente, em Mensagens — aqui só marcamos que a Clara
 * está aguardando a resposta). */
export async function enviarCheckinAction(authId: string): Promise<ActionResult> {
  await assertAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("checkins").insert({
    auth_id: authId,
    status: "enviado",
    enviado_em: new Date().toISOString(),
    semana: new Date().toISOString().slice(0, 10),
    origem: "manual",
  });
  if (error) return { success: false, message: `Erro ao registrar envio: ${error.message}` };

  await syncPendencias();
  revalidatePath("/checkins");
  revalidatePath("/clara");
  return { success: true, message: "Check-in marcado como enviado." };
}

/** Registra a resposta de um check-in. Se houver um check-in "enviado" em
 * aberto para o paciente, completa esse registro; caso contrário, cria um
 * novo já como respondido (lançamento manual). Nunca interpreta a resposta
 * clinicamente — só guarda o resumo para o nutricionista revisar. */
export async function registrarRespostaCheckinAction(
  authId: string,
  resumo: string,
  pontuacao?: number,
): Promise<ActionResult> {
  await assertAdmin();
  const supabase = await createClient();

  const { data: pendente } = await supabase
    .from("checkins")
    .select("id")
    .eq("auth_id", authId)
    .eq("status", "enviado")
    .order("enviado_em", { ascending: false })
    .limit(1)
    .maybeSingle();

  const respondidoEm = new Date().toISOString();
  const { error } = pendente
    ? await supabase
        .from("checkins")
        .update({ status: "respondido", respondido_em: respondidoEm, resumo, pontuacao: pontuacao ?? null })
        .eq("id", pendente.id)
    : await supabase.from("checkins").insert({
        auth_id: authId,
        status: "respondido",
        respondido_em: respondidoEm,
        semana: new Date().toISOString().slice(0, 10),
        resumo,
        pontuacao: pontuacao ?? null,
        origem: "manual",
      });

  if (error) return { success: false, message: `Erro ao registrar resposta: ${error.message}` };

  await syncPendencias();
  revalidatePath("/checkins");
  revalidatePath("/clara");
  return { success: true, message: "Resposta do check-in registrada." };
}

export async function marcarCheckinRevisadoAction(id: number): Promise<ActionResult> {
  await assertAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("checkins").update({ revisado: true }).eq("id", id);
  if (error) return { success: false, message: `Erro ao marcar como revisado: ${error.message}` };

  revalidatePath("/checkins");
  return { success: true, message: "Check-in marcado como revisado." };
}
