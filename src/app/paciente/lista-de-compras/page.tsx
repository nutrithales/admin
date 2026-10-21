import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPlanoAlimentarPacienteAtual } from "@/services/paciente-plano.queries";
import WeeklyShoppingClient from "./WeeklyShoppingClient";

export const metadata = { title: "Lista de compras semanal | Nutri Thales" };

export default async function ShoppingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/paciente/login");
  const { data: access, error } = await supabase.from("paginas_paciente").select("id").eq("user_id", user.id).eq("ativo", true).eq("url_pagina", "/paciente/lista-de-compras").limit(1).maybeSingle();
  if (error) throw new Error("Não foi possível verificar o acesso à lista de compras.");
  if (!access) redirect("/paciente");
  const plan = await getPlanoAlimentarPacienteAtual();
  if (!plan) return <main className="p-6"><Link href="/paciente">Voltar</Link><p>Seu plano alimentar ainda não está disponível.</p></main>;
  const fixedItems = new Set(plan.substituicoes.filter(s => s.grupo === "Substituições prescritas").map(s => s.itemId));
  plan.substituicoes = plan.substituicoes.filter(s => !fixedItems.has(s.itemId) || s.grupo === "Substituições prescritas");
  return <WeeklyShoppingClient plan={plan} storageScope={user.id} />;
}
