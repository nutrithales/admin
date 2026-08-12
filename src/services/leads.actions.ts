"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { assertAdmin } from "@/lib/supabase/assert-admin";
import { createClient } from "@/lib/supabase/server";
import { LEAD_STAGES } from "@/lib/leads/stages";
import type { ActionResult } from "@/services/pacientes.actions";

const keys = LEAD_STAGES.map((item) => item.key) as [string, ...string[]];
const leadSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome do lead.").max(120),
  telefone: z.string().trim().max(30).nullable().optional(),
  email: z.union([z.literal(""), z.string().email("E-mail inválido.")]).nullable().optional(),
  origem: z.string().trim().max(80).nullable().optional(),
  planoInteresse: z.string().trim().max(80).nullable().optional(),
  observacoes: z.string().trim().max(3000).nullable().optional(),
  proximaAcaoEm: z.string().datetime().nullable().optional(),
  urgente: z.boolean().optional(),
  etapa: z.enum(keys).optional(),
});

export type LeadInput = z.input<typeof leadSchema>;

export async function createLeadAction(input: LeadInput): Promise<ActionResult> {
  await assertAdmin();
  const parsed = leadSchema.safeParse(input);
  if (!parsed.success) return { success: false, message: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  const d = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.from("leads").insert({ nome: d.nome, telefone: d.telefone || null, email: d.email || null, origem: d.origem || null, plano_interesse: d.planoInteresse || null, observacoes: d.observacoes || null, proxima_acao_em: d.proximaAcaoEm || null, urgente: d.urgente ?? false, etapa: d.etapa ?? "01_lead_recebido" });
  if (error) return { success: false, message: `Erro ao cadastrar lead: ${error.message}` };
  revalidatePath("/leads");
  return { success: true, message: "Lead cadastrado." };
}

export async function updateLeadAction(id: string, input: Partial<LeadInput>): Promise<ActionResult> {
  await assertAdmin();
  if (!z.string().uuid().safeParse(id).success) return { success: false, message: "Lead inválido." };
  const parsed = leadSchema.partial().safeParse(input);
  if (!parsed.success) return { success: false, message: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  const d = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.from("leads").update({ ...(d.nome !== undefined ? { nome: d.nome } : {}), ...(d.telefone !== undefined ? { telefone: d.telefone || null } : {}), ...(d.email !== undefined ? { email: d.email || null } : {}), ...(d.origem !== undefined ? { origem: d.origem || null } : {}), ...(d.planoInteresse !== undefined ? { plano_interesse: d.planoInteresse || null } : {}), ...(d.observacoes !== undefined ? { observacoes: d.observacoes || null } : {}), ...(d.proximaAcaoEm !== undefined ? { proxima_acao_em: d.proximaAcaoEm } : {}), ...(d.urgente !== undefined ? { urgente: d.urgente } : {}), ...(d.etapa !== undefined ? { etapa: d.etapa } : {}), updated_at: new Date().toISOString() }).eq("id", id);
  if (error) return { success: false, message: `Erro ao atualizar lead: ${error.message}` };
  revalidatePath("/leads");
  return { success: true, message: "Lead atualizado." };
}

export async function deleteLeadAction(id: string): Promise<ActionResult> {
  await assertAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("leads").delete().eq("id", id);
  if (error) return { success: false, message: `Erro ao excluir lead: ${error.message}` };
  revalidatePath("/leads");
  return { success: true, message: "Lead excluído." };
}
