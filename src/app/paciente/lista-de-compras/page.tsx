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
  // Each authenticated patient receives only their latest finalized plan.
  // No individual paginas_paciente registration is needed for this feature.
  const plan = await getPlanoAlimentarPacienteAtual();
  if (!plan) return <main className="p-6"><Link href="/paciente">Voltar</Link><p>Seu plano alimentar ainda não está disponível.</p></main>;
  const fixedItems = new Set(plan.substituicoes.filter(s => s.grupo === "Substituições prescritas").map(s => s.itemId));
  plan.substituicoes = plan.substituicoes.filter(s => !fixedItems.has(s.itemId) || s.grupo === "Substituições prescritas");
  return <WeeklyShoppingClient plan={plan} storageScope={user.id} />;
}
