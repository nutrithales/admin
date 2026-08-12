import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database.types";

export type CheckinComPaciente = Tables<"checkins"> & {
  paciente: (Pick<Tables<"pacientes">, "id" | "nome"> & { telefone?: string | null }) | null;
};

export async function listCheckins(): Promise<CheckinComPaciente[]> {
  const supabase = await createClient();
  const [{ data: checkins, error }, { data: pacientes }] = await Promise.all([
    supabase.from("checkins").select("*").order("created_at", { ascending: false }).limit(100),
    supabase.from("pacientes").select("id, auth_id, nome, telefone"),
  ]);
  if (error) throw new Error(`Erro ao carregar check-ins: ${error.message}`);
  const porAuthId = new Map((pacientes ?? []).map((p) => [p.auth_id, p]));
  return (checkins ?? []).map((checkin) => ({ ...checkin, paciente: porAuthId.get(checkin.auth_id) ?? null })) as CheckinComPaciente[];
}

export async function getCheckinDetalhe(id: number) {
  const supabase = (await createClient()) as any;
  const { data: checkin, error } = await supabase.from("checkins").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(`Erro ao carregar check-in: ${error.message}`);
  if (!checkin) return null;

  const { data: paciente } = await supabase
    .from("pacientes")
    .select("id,auth_id,nome,telefone,email,plano,objetivo,status")
    .eq("auth_id", checkin.auth_id)
    .maybeSingle();

  const pacienteId = checkin.paciente_id ?? paciente?.id;
  const { data: historico } = pacienteId
    ? await supabase
        .from("checkins")
        .select("id,semana,pontuacao,resumo,analise_ia,orientacoes_ia,mensagem_paciente,respondido_em,respostas,revisado")
        .eq("paciente_id", pacienteId)
        .order("semana", { ascending: false })
        .limit(12)
    : { data: [] } as any;

  return { checkin, paciente, historico: historico ?? [] };
}
