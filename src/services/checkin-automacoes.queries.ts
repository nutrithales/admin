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

export type CheckinAdesaoPaciente = {
  paciente_id: string;
  nome: string;
  status: string | null;
  enviados: number;
  respondidos: number;
  expirados: number;
  taxa_resposta: number;
  faltas_consecutivas: number;
  ultimo_status: string | null;
  ultimo_envio_em: string | null;
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

export async function listCheckinAdesaoPacientes(): Promise<CheckinAdesaoPaciente[]> {
  const supabase = (await createClient()) as any;
  const [{ data: pacientes }, { data: envios }] = await Promise.all([
    supabase.from("pacientes").select("id,nome,status").order("nome", { ascending: true }),
    supabase
      .from("formulario_envios")
      .select("paciente_id,status,agendado_para, formulario:formularios(tipo)")
      .order("agendado_para", { ascending: false }),
  ]);

  const checkinEnvios = (envios ?? []).filter((e: any) => e.formulario?.tipo === "checkin");
  return (pacientes ?? []).map((p: any) => {
    const itens = checkinEnvios.filter((e: any) => e.paciente_id === p.id);
    const encerrados = itens.filter((e: any) => e.status === "respondido" || e.status === "expirado");
    const respondidos = encerrados.filter((e: any) => e.status === "respondido").length;
    const expirados = encerrados.filter((e: any) => e.status === "expirado").length;
    let faltasConsecutivas = 0;
    for (const item of encerrados) {
      if (item.status !== "expirado") break;
      faltasConsecutivas += 1;
    }
    return {
      paciente_id: p.id,
      nome: p.nome ?? "Paciente sem nome",
      status: p.status,
      enviados: itens.length,
      respondidos,
      expirados,
      taxa_resposta: encerrados.length ? Math.round((respondidos / encerrados.length) * 100) : 0,
      faltas_consecutivas: faltasConsecutivas,
      ultimo_status: itens[0]?.status ?? null,
      ultimo_envio_em: itens[0]?.agendado_para ?? null,
    };
  }).filter((p: CheckinAdesaoPaciente) => p.enviados > 0);
}
