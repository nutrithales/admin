import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export const SERVICOS = {
  consulta_avulsa: { label: "Consulta Avulsa", descricao: "Prestação de serviço de assessoria e acompanhamento em condicionamento físico geral, correspondente a 1 (uma) consulta individual, conforme contratação de Consulta Avulsa." },
  plano_essencial: { label: "Plano Essencial", descricao: "Consultas de assessoria e acompanhamento em condicionamento físico geral, correspondentes a 3 (três) sessões, com prazo de utilização de até 4 (quatro) meses, conforme Plano Essencial." },
  plano_evolucao: { label: "Plano Evolução", descricao: "Prestação de serviços de assessoria e acompanhamento em condicionamento físico geral, correspondentes a 6 (seis) consultas, com prazo de utilização de até 8 (oito) meses, conforme Plano Evolução." },
  plano_elite_premium: { label: "Plano Elite Premium", descricao: "Prestação de serviços de assessoria e acompanhamento em condicionamento físico geral, correspondentes a 9 (nove) consultas, com prazo de utilização de até 12 (doze) meses, conforme Plano Elite Premium." },
} as const;
export type ServicoKey = keyof typeof SERVICOS;

type PagamentoInsert = { paciente_id:string; servico:string; valor:number; pago_em:string; forma_pagamento?:string; observacoes?:string; descricao_nota:string; nota_emitida:boolean };

export async function listPagamentos() {
  const supabase = await createClient();
  const { data, error } = await (supabase as any).from("pagamentos").select("*, pacientes(nome)").order("pago_em", { ascending: false });
  if (error) return [];
  return data ?? [];
}
export async function createPagamentoAction(form: { paciente_id:string; servico:ServicoKey; valor:number; pago_em:string; forma_pagamento?:string; observacoes?:string }) {
  "use server";
  const supabase = await createClient();
  const payload: PagamentoInsert = { ...form, descricao_nota: SERVICOS[form.servico].descricao, nota_emitida:false };
  const { error } = await (supabase as any).from("pagamentos").insert(payload);
  if (error) return { success:false, message:error.message };
  revalidatePath("/pagamentos"); return { success:true, message:"Pagamento registrado." };
}
export async function toggleNotaAction(id:string, nota_emitida:boolean) {
  "use server";
  const supabase = await createClient();
  const { error } = await (supabase as any).from("pagamentos").update({ nota_emitida, updated_at:new Date().toISOString() }).eq("id",id);
  if (error) return { success:false, message:error.message };
  revalidatePath("/pagamentos"); return { success:true };
}