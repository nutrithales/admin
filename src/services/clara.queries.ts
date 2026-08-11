import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database.types";

export interface ConsultaDoDia {
  id: string;
  pacienteId: string | null;
  authId: string;
  paciente: string;
  hora: string;
  dataIso: string | null;
  tipo: string | null;
  status: string | null;
}

export function inicioDoDia(base = new Date()): Date {
  const d = new Date(base);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function fimDoDia(base = new Date()): Date {
  const d = new Date(base);
  d.setHours(23, 59, 59, 999);
  return d;
}

/** Consultas (não canceladas) com horário dentro do intervalo, já com o
 * nome do paciente resolvido — usada no resumo do dia e nos comandos de
 * agenda/confirmação da Clara. */
export async function listConsultasDoIntervalo(inicio: Date, fim: Date): Promise<ConsultaDoDia[]> {
  const supabase = await createClient();
  const [{ data: consultas, error }, { data: pacientes }] = await Promise.all([
    supabase
      .from("consultas")
      .select("*")
      .gte("data", inicio.toISOString())
      .lte("data", fim.toISOString())
      .neq("status", "cancelada")
      .order("data", { ascending: true }),
    supabase.from("pacientes").select("id, auth_id, nome"),
  ]);

  if (error) throw new Error(`Erro ao carregar consultas: ${error.message}`);

  const porAuth = new Map((pacientes ?? []).map((p) => [p.auth_id, p]));
  return (consultas ?? []).map((c: Tables<"consultas">) => {
    const paciente = porAuth.get(c.auth_id);
    return {
      id: c.id,
      pacienteId: paciente?.id ?? null,
      authId: c.auth_id,
      paciente: paciente?.nome ?? "Paciente",
      hora: c.data ? new Date(c.data).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "—",
      dataIso: c.data,
      tipo: c.tipo,
      status: c.status,
    };
  });
}
