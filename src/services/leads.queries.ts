import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database.types";
import { nextFollowup, type LeadFollowupFlow } from "@/lib/leads/followups";

export type Lead = Tables<"leads">;
export type LeadFollowupPendente = { lead: Lead; dia:number; etiqueta:string; titulo:string; mensagem:string; due:Date; vencido:boolean };

export async function listLeads():Promise<Lead[]>{const supabase=await createClient();const{data,error}=await supabase.from("leads").select("*").is("convertido_paciente_id",null).order("updated_at",{ascending:false});if(error)throw new Error(`Erro ao carregar leads: ${error.message}`);return data??[];}

export async function listLeadFollowupsPendentes():Promise<LeadFollowupPendente[]>{
  const leads=await listLeads(); const now=new Date();
  return leads.flatMap((lead)=>{if(!lead.fluxo_followup||!lead.followup_inicio_em)return[];const next=nextFollowup(lead.fluxo_followup as LeadFollowupFlow,lead.followup_inicio_em,lead.ultimo_followup_enviado_dia,now);return next?[{lead,...next}]:[];}).filter(item=>item.vencido).sort((a,b)=>a.due.getTime()-b.due.getTime());
}
