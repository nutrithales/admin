"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { assertAdmin } from "@/lib/supabase/assert-admin";
import { createClient } from "@/lib/supabase/server";
import { LEAD_STAGES } from "@/lib/leads/stages";
import type { LeadFollowupFlow } from "@/lib/leads/followups";
import type { ActionResult } from "@/services/pacientes.actions";

const keys = LEAD_STAGES.map((item) => item.key) as [string, ...string[]];
const leadSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome do lead.").max(120), telefone: z.string().trim().max(30).nullable().optional(), email: z.union([z.literal(""), z.string().email("E-mail inválido.")]).nullable().optional(), origem: z.string().trim().max(80).nullable().optional(), planoInteresse: z.string().trim().max(80).nullable().optional(), observacoes: z.string().trim().max(3000).nullable().optional(), proximaAcaoEm: z.string().datetime().nullable().optional(), urgente: z.boolean().optional(), etapa: z.enum(keys).optional(),
});
export type LeadInput = z.input<typeof leadSchema>;

function followupForStage(etapa?: string) {
  if (etapa === "04_followup_lead") return "lead" as LeadFollowupFlow;
  if (etapa === "05_followup_proposta" || etapa === "03_planos_apresentados") return "proposta" as LeadFollowupFlow;
  return null;
}

export async function createLeadAction(input: LeadInput): Promise<ActionResult> {
  await assertAdmin(); const parsed = leadSchema.safeParse(input); if (!parsed.success) return { success: false, message: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  const d = parsed.data; const etapa = d.etapa ?? "01_lead_recebido"; const flow = followupForStage(etapa); const now = new Date().toISOString(); const supabase = await createClient();
  const { error } = await supabase.from("leads").insert({ nome:d.nome, telefone:d.telefone||null, email:d.email||null, origem:d.origem||null, plano_interesse:d.planoInteresse||null, observacoes:d.observacoes||null, proxima_acao_em:d.proximaAcaoEm||null, urgente:d.urgente??false, etapa, fluxo_followup:flow, followup_inicio_em:flow?now:null, ultimo_followup_enviado_dia:null });
  if (error) return { success:false, message:`Erro ao cadastrar lead: ${error.message}` }; revalidatePath("/leads"); revalidatePath("/clara"); return { success:true, message:"Lead cadastrado." };
}

export async function updateLeadAction(id:string,input:Partial<LeadInput>):Promise<ActionResult>{
  await assertAdmin(); if(!z.string().uuid().safeParse(id).success)return{success:false,message:"Lead inválido."}; const parsed=leadSchema.partial().safeParse(input); if(!parsed.success)return{success:false,message:parsed.error.issues[0]?.message??"Dados inválidos."}; const d=parsed.data; const supabase=await createClient();
  const patch: Record<string, unknown>={...(d.nome!==undefined?{nome:d.nome}:{}),...(d.telefone!==undefined?{telefone:d.telefone||null}:{}),...(d.email!==undefined?{email:d.email||null}:{}),...(d.origem!==undefined?{origem:d.origem||null}:{}),...(d.planoInteresse!==undefined?{plano_interesse:d.planoInteresse||null}:{}),...(d.observacoes!==undefined?{observacoes:d.observacoes||null}:{}),...(d.proximaAcaoEm!==undefined?{proxima_acao_em:d.proximaAcaoEm}:{}),...(d.urgente!==undefined?{urgente:d.urgente}:{}),...(d.etapa!==undefined?{etapa:d.etapa}:{}),updated_at:new Date().toISOString()};
  if(d.etapa!==undefined){ const {data:current}=await supabase.from("leads").select("etapa,fluxo_followup").eq("id",id).single(); const flow=followupForStage(d.etapa); if(flow && (current?.etapa!==d.etapa || current?.fluxo_followup!==flow)){patch.fluxo_followup=flow;patch.followup_inicio_em=new Date().toISOString();patch.ultimo_followup_enviado_dia=null;patch.ultimo_followup_enviado_em=null;} else if(!flow && !["03_planos_apresentados"].includes(d.etapa)){patch.fluxo_followup=null;patch.followup_inicio_em=null;patch.ultimo_followup_enviado_dia=null;} }
  const {error}=await supabase.from("leads").update(patch).eq("id",id); if(error)return{success:false,message:`Erro ao atualizar lead: ${error.message}`}; revalidatePath("/leads");revalidatePath("/clara");return{success:true,message:"Lead atualizado."};
}

export async function registrarFollowupEnviadoAction(id:string,dia:number):Promise<ActionResult>{
  await assertAdmin(); const supabase=await createClient(); const {data:lead,error:readError}=await supabase.from("leads").select("fluxo_followup").eq("id",id).single(); if(readError||!lead)return{success:false,message:"Lead não encontrado."};
  const patch:Record<string,unknown>={ultimo_followup_enviado_dia:dia,ultimo_followup_enviado_em:new Date().toISOString(),updated_at:new Date().toISOString()};
  if(lead.fluxo_followup==="lead"&&dia===30){patch.etapa="07_nao_respondeu";patch.fluxo_followup=null;} if(lead.fluxo_followup==="proposta"&&dia===10){patch.etapa="06_interessado_proximo_mes";patch.fluxo_followup=null;}
  const {error}=await supabase.from("leads").update(patch).eq("id",id); if(error)return{success:false,message:`Erro ao registrar follow-up: ${error.message}`}; revalidatePath("/leads");revalidatePath("/clara");return{success:true,message:"Follow-up registrado."};
}

export async function deleteLeadAction(id:string):Promise<ActionResult>{await assertAdmin();const supabase=await createClient();const{error}=await supabase.from("leads").delete().eq("id",id);if(error)return{success:false,message:`Erro ao excluir lead: ${error.message}`};revalidatePath("/leads");revalidatePath("/clara");return{success:true,message:"Lead excluído."};}
