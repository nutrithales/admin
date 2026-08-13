"use server";
import { revalidatePath } from "next/cache";
import { assertAdmin } from "@/lib/supabase/assert-admin";
import { createClient } from "@/lib/supabase/server";
import { consultaSchema, type ConsultaFormValues } from "@/utils/validation/consulta";
import type { ActionResult } from "@/services/pacientes.actions";
import { type ConsultaStatus } from "@/lib/clara/consultas";
import { syncPendencias } from "@/services/pendencias.actions";

export async function createConsultaAction(values: ConsultaFormValues): Promise<ActionResult> {
  await assertAdmin(); const parsed = consultaSchema.safeParse(values);
  if (!parsed.success) return { success:false, message: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  const supabase = await createClient(); const { paciente_id, data_hora, observacoes, ...rest } = parsed.data;
  const { error } = await supabase.from("consultas").insert({ ...rest, auth_id:paciente_id, data:data_hora, observacoes:observacoes || null });
  if (error) return { success:false, message:`Erro ao agendar consulta: ${error.message}` };
  await syncPendencias(); revalidatePath("/consultas"); revalidatePath("/clara"); return { success:true, message:"Consulta agendada." };
}

export async function updateConsultaAction(id:string, values:ConsultaFormValues): Promise<ActionResult> {
  await assertAdmin(); const parsed=consultaSchema.safeParse(values);
  if (!parsed.success) return { success:false, message:parsed.error.issues[0]?.message ?? "Dados inválidos." };
  const supabase=await createClient(); const { paciente_id,data_hora,observacoes,...rest }=parsed.data;
  const { error }=await supabase.from("consultas").update({ ...rest, auth_id:paciente_id, data:data_hora, observacoes:observacoes || null }).eq("id",id);
  if (error) return { success:false, message:`Erro ao atualizar consulta: ${error.message}` };
  await syncPendencias(); revalidatePath("/consultas"); revalidatePath("/clara"); return { success:true, message:"Consulta atualizada." };
}

export async function deleteConsultaAction(id:string): Promise<ActionResult> {
  await assertAdmin(); const supabase=await createClient(); const { error }=await supabase.from("consultas").delete().eq("id",id);
  if (error) return { success:false, message:`Erro ao excluir consulta: ${error.message}` };
  await syncPendencias(); revalidatePath("/consultas"); revalidatePath("/clara"); return { success:true, message:"Consulta excluída." };
}

const STATUS_LABEL: Record<ConsultaStatus,string>={agendada:"marcada como agendada",confirmada:"confirmada",realizada:"marcada como realizada",cancelada:"cancelada",nao_compareceu:"marcada como não compareceu",reagendada:"marcada para reagendamento"};

export async function updateConsultaStatusAction(id:string,status:ConsultaStatus): Promise<ActionResult> {
  await assertAdmin(); const supabase=await createClient(); const db=supabase as any;
  const { data:updated,error }=await db.from("consultas").update({status,confirmada_em:status==="confirmada"?new Date().toISOString():undefined}).eq("id",id).select("auth_id").maybeSingle();
  if (error) return { success:false, message:`Erro ao atualizar consulta: ${error.message}` };
  if (status==="realizada" && updated?.auth_id) {
    const agora=new Date().toISOString();
    const { data:paciente }=await db.from("pacientes").select("id,fluxo_etapa").eq("auth_id",updated.auth_id).maybeSingle();
    if (paciente) {
      await db.from("pacientes").update({fluxo_etapa:"06_plano_elaboracao",fluxo_proxima_acao_em:null,plano_entregue_em:null,proxima_reconsulta_prevista:null,fluxo_updated_at:agora}).eq("id",paciente.id);
      if (paciente.fluxo_etapa!=="06_plano_elaboracao") await db.from("fluxo_movimentacoes").insert({paciente_id:paciente.id,de_etapa:paciente.fluxo_etapa,para_etapa:"06_plano_elaboracao",admin_id:null,observacao:"Consulta realizada. Reconsulta será calculada após a entrega do plano."});
    }
  }
  await syncPendencias(); for (const p of ["/consultas","/agenda","/clara","/pacientes","/fluxo"]) revalidatePath(p);
  return { success:true, message:`Consulta ${STATUS_LABEL[status]}.` };
}
