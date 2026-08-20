import "server-only";
import { createClient } from "@/lib/supabase/server";

export type CheckinAutomacao = {
  id: string;
  formulario_id: string;
  nome: string;
  publico: "todos" | "ativos" | "selecionados";
  paciente_ids: string[];
  frequencia_tipo: "intervalo" | "semanal" | "mensal";
  recorrencia_dias: number;
  dia_semana: number | null;
  dia_mes: number | null;
  prazo_resposta_dias: number;
  primeira_execucao_em: string;
  proximo_disparo_em: string;
  ultimo_disparo_em: string | null;
  ativo: boolean;
  formulario: { id: string; nome: string; tipo: string } | null;
};

export async function listCheckinAutomacoes(): Promise<CheckinAutomacao[]> {
  const supabase = (await createClient()) as any;
  const { data, error } = await supabase
    .from("formulario_automacoes")
    .select("id,formulario_id,nome,publico,paciente_ids,frequencia_tipo,recorrencia_dias,dia_semana,dia_mes,prazo_resposta_dias,primeira_execucao_em,proximo_disparo_em,ultimo_disparo_em,ativo,formulario:formularios(id,nome,tipo)")
    .order("proximo_disparo_em", { ascending: true });

  if (error) throw new Error(`Erro ao carregar automações de check-in: ${error.message}`);
  return (data ?? []) as CheckinAutomacao[];
}

export async function getCheckinDashboardResumo() {
  const supabase = (await createClient()) as any;
  const agora = new Date().toISOString();

  const [concluidos, aguardando, analisar, proximos, expirados] = await Promise.all([
    supabase.from("checkins").select("id", { count: "exact", head: true }).eq("revisado", true).eq("status", "respondido"),
    supabase.from("formulario_envios").select("id", { count: "exact", head: true }).in("status", ["enviado", "visualizado"]),
    supabase.from("checkins").select("id", { count: "exact", head: true }).eq("revisado", false).eq("status", "respondido"),
    supabase.from("formulario_envios").select("id", { count: "exact", head: true }).eq("status", "agendado").gte("agendado_para", agora),
    supabase.from("formulario_envios").select("id", { count: "exact", head: true }).eq("status", "expirado"),
  ]);

  return {
    concluidos: concluidos.count ?? 0,
    aguardando: aguardando.count ?? 0,
    analisar: analisar.count ?? 0,
    proximos: proximos.count ?? 0,
    expirados: expirados.count ?? 0,
  };
}
