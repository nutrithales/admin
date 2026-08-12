import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database.types";

export type Lead = Tables<"leads">;

export async function listLeads(): Promise<Lead[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("leads").select("*").is("convertido_paciente_id", null).order("updated_at", { ascending: false });
  if (error) throw new Error(`Erro ao carregar leads: ${error.message}`);
  return data ?? [];
}
