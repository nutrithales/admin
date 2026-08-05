import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database.types";

export type CheckinComPaciente = Tables<"checkins"> & {
  paciente: Pick<Tables<"pacientes">, "id" | "nome"> | null;
};

export async function listCheckins(): Promise<CheckinComPaciente[]> {
  const supabase = await createClient();
  const [{ data: checkins, error }, { data: pacientes }] = await Promise.all([
    supabase
      .from("checkins")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100),
    supabase.from("pacientes").select("id, auth_id, nome"),
  ]);

  if (error) throw new Error(`Erro ao carregar check-ins: ${error.message}`);

  const porAuthId = new Map((pacientes ?? []).map((p) => [p.auth_id, p]));
  return (checkins ?? []).map((checkin) => ({
    ...checkin,
    paciente: porAuthId.get(checkin.auth_id) ?? null,
  }));
}
