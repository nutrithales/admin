import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database.types";
import { LEAD_FOLLOWUPS, type LeadFollowupFlow } from "@/lib/leads/followups";

export type Lead = Tables<"leads"> & {
  fluxo_followup: string | null;
  followup_inicio_em: string | null;
  ultimo_followup_enviado_dia: number | null;
  ultimo_followup_enviado_em: string | null;
  proximo_followup_em?: string | null;
  proximo_followup_etiqueta?: string | null;
};
export type LeadFollowupPendente = { lead: Lead; dia:number; etiqueta:string; titulo:string; mensagem:string; due:Date; vencido:boolean };

export async function listLeads():Promise<Lead[]> {
  const supabase=await createClient();
  const db=supabase as any;
  const leadsTable=db.from("leads");
  const followupsTable=db.from("lead_followups_agendados");
  const {data,error}=await leadsTable.select("*").is("convertido_paciente_id",null).order("updated_at",{ascending:false});
  if(error)throw new Error(`Erro ao carregar leads: ${error.message}`);
  const leads=(data??[]) as Lead[];
  if(!leads.length)return leads;
  const {data:agendados}=await followupsTable.select("lead_id,etiqueta,agendado_para").eq("status","pendente").in("lead_id",leads.map(l=>l.id)).order("agendado_para",{ascending:true});
  const nextByLead=new Map<string,{etiqueta:string;agendado_para:string}>();
  for(const item of agendados??[]) if(!nextByLead.has(item.lead_id)) nextByLead.set(item.lead_id,item);
  return leads.map(lead=>{const next=nextByLead.get(lead.id);return {...lead,proximo_followup_em:next?.agendado_para??null,proximo_followup_etiqueta:next?.etiqueta??null};});
}

export async function listLeadFollowupsPendentes():Promise<LeadFollowupPendente[]> {
  const supabase=await createClient();
  const db=supabase as any;
  const followupsTable=db.from("lead_followups_agendados");
  const {data:rows,error}=await followupsTable.select("lead_id,fluxo,dia,etiqueta,agendado_para").eq("status","pendente").lte("agendado_para",new Date().toISOString()).order("agendado_para",{ascending:true});
  if(error)throw new Error(`Erro ao carregar follow-ups: ${error.message}`);
  if(!rows?.length)return [];
  const leadsTable=db.from("leads");
  const {data:leadRows,error:leadError}=await leadsTable.select("*").in("id",[...new Set(rows.map((r:any)=>r.lead_id))]);
  if(leadError)throw new Error(`Erro ao carregar leads dos follow-ups: ${leadError.message}`);
  const leadMap=new Map((leadRows??[]).map((l:any)=>[l.id,l as Lead]));
  return rows.flatMap((row:any)=>{
    const lead=leadMap.get(row.lead_id); if(!lead)return [];
    const flow=row.fluxo as LeadFollowupFlow;
    const template=LEAD_FOLLOWUPS[flow].find(item=>item.dia===row.dia); if(!template)return [];
    return [{lead,dia:row.dia,etiqueta:row.etiqueta,titulo:template.titulo,mensagem:template.mensagem,due:new Date(row.agendado_para),vencido:true}];
  });
}
