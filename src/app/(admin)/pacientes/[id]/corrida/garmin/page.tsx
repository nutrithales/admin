import Link from "next/link";
import { getCalendarStatus } from "@/services/running-calendar";
export const metadata = { title: "Garmin: calendário do paciente" };
export default async function AdminCalendarPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const status = await getCalendarStatus(id);
  const date = (s: string | null) => s ? new Date(s).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }) : "—";
  return <main className="mx-auto max-w-3xl p-6"><Link href={`/pacientes/${id}/corrida`} className="inline-flex min-h-11 font-bold">← Voltar para Corrida</Link><h1 className="mt-6 text-2xl font-bold">Envio para Garmin via Intervals.icu</h1><section className="mt-5 rounded-2xl border border-border bg-white p-5"><p className="font-bold">{status.active ? "Calendário privado ativo" : "Calendário não ativado pelo paciente"}</p><p className="mt-3">Última consulta ao link: {date(status.lastFetched)}</p><p className="mt-2">Validade: {date(status.expires)}</p><p className="mt-4 text-sm leading-6">O paciente configura o envio em <b>Corrida → Enviar para Garmin</b>, gera o link privado e adiciona ao Intervals.icu com “Events are workouts”. Depois conecta o Garmin e habilita “Upload planned workouts”. Não é preciso cadastrar outro aplicativo nem fornecer senha ou chave de API.</p><p className="mt-3 text-sm leading-6">A última consulta confirma apenas a leitura do calendário. A chegada dos blocos e alvos ao relógio precisa ser conferida pelo paciente no primeiro treino. A liberação mensal e os paces vigentes são aplicados a cada consulta.</p><p className="mt-3 text-sm leading-6">Não há importação automática de atividades ou feedback. O link privado só aparece para o paciente ao gerá-lo.</p></section></main>;
}
