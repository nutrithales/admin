import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database.types";

export interface DashboardStats {
  pacientesAtivos: number;
  pacientesInativos: number;
  consultasFuturas: number;
  paginasPersonalizadas: number;
  planosAlimentares: number;
  conteudosBiblioteca: number;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const supabase = await createClient();

  const [
    { count: pacientesAtivos },
    { count: pacientesInativos },
    { count: consultasFuturas },
    { count: paginasPersonalizadas },
    { count: planosAlimentares },
    { count: conteudosBiblioteca },
  ] = await Promise.all([
    supabase.from("pacientes").select("*", { count: "exact", head: true }).eq("status", "ativo"),
    supabase.from("pacientes").select("*", { count: "exact", head: true }).eq("status", "inativo"),
    supabase
      .from("consultas")
      .select("*", { count: "exact", head: true })
      .gte("data", new Date().toISOString())
      .neq("status", "cancelada"),
    supabase.from("paginas_paciente").select("*", { count: "exact", head: true }).eq("ativo", true),
    supabase.from("planos_alimentares").select("*", { count: "exact", head: true }),
    supabase.from("biblioteca").select("*", { count: "exact", head: true }).eq("ativo", true),
  ]);

  return {
    pacientesAtivos: pacientesAtivos ?? 0,
    pacientesInativos: pacientesInativos ?? 0,
    consultasFuturas: consultasFuturas ?? 0,
    paginasPersonalizadas: paginasPersonalizadas ?? 0,
    planosAlimentares: planosAlimentares ?? 0,
    conteudosBiblioteca: conteudosBiblioteca ?? 0,
  };
}

export async function getRecentPacientes(limit = 5): Promise<Tables<"pacientes">[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("pacientes")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}

export async function getRecentLogins(limit = 5): Promise<Tables<"pacientes">[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("pacientes")
    .select("*")
    .not("last_login_at", "is", null)
    .order("last_login_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}
