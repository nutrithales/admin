import { notFound } from "next/navigation";
import Link from "next/link";
import { getRunningData } from "@/services/running.queries";
import RunningDashboard from "@/app/paciente/corrida/RunningDashboard";
export const metadata = { title: "Corridas e feedbacks do paciente" };
export default async function AdminRunningPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getRunningData(id);
  if (!data) notFound();
  if (!data.cycles.length) return <main className="p-6"><Link href={`/pacientes/${id}`}>Voltar ao perfil</Link><h1 className="mt-5 text-xl font-bold">Nenhum plano de corrida cadastrado.</h1></main>;
  return <RunningDashboard data={data} admin backHref={`/pacientes/${id}`} />;
}
