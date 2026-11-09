import Link from "next/link";
import { redirect } from "next/navigation";
import { getRunningData } from "@/services/running.queries";
import RunningDashboard from "./RunningDashboard";
export const metadata = { title: "Corrida e evolução | Nutri Thales" };
export default async function RunningPage() {
  const data = await getRunningData();
  if (!data) redirect("/paciente/login");
  if (!data.cycles.length) return <main className="mx-auto max-w-3xl p-6"><Link href="/paciente">Voltar</Link><h1 className="mt-6 text-2xl font-bold">Seu plano de corrida ainda não está disponível.</h1></main>;
  return <RunningDashboard data={data} />;
}
