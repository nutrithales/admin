"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { SERVICOS, type ServicoKey } from "@/lib/pagamentos/catalogo";

type PagamentoInsert = { paciente_id:string; servico:string; valor:number; pago_em:string; forma_pagamento?:string; observacoes?:string; descricao_nota:string; nota_emitida:boolean };

export async function listPagamentos() {
  const supabase = await createClient();
  const { data, error } = await (supabase as any).from("pagamentos").select("*, pacientes(nome)").order("pago_em", { ascending: false });
  if (error) return [];
  return data ?? [];
}
export async function createPagamentoAction(form: { paciente_id:string; servico:ServicoKey; valor:number; pago_em:string; forma_pagamento?:string; observacoes?:string }) {
  const supabase = await createClient();
  const payload: PagamentoInsert = { ...form, descricao_nota: SERVICOS[form.servico].descricao, nota_emitida:false };
  const { error } = await (supabase as any).from("pagamentos").insert(payload);
  if (error) return { success:false, message:error.message };
  revalidatePath("/pagamentos"); return { success:true, message:"Pagamento registrado." };
}
export async function toggleNotaAction(id:string, nota_emitida:boolean) {
  const supabase = await createClient();
  const { error } = await (supabase as any).from("pagamentos").update({ nota_emitida, updated_at:new Date().toISOString() }).eq("id",id);
  if (error) return { success:false, message:error.message };
  revalidatePath("/pagamentos"); return { success:true };
}
export async function deletePagamentoAction(id:string) {
  const supabase = await createClient();
  const { error } = await (supabase as any).from("pagamentos").delete().eq("id",id);
  if (error) return { success:false, message:error.message };
  revalidatePath("/pagamentos"); return { success:true, message:"Lançamento excluído." };
}