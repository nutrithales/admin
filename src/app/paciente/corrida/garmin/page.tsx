import Link from "next/link";
import { getCalendarStatus } from "@/services/running-calendar";
import CalendarConnection from "./CalendarConnection";
export const metadata = { title: "Enviar corrida para Garmin | Nutri Thales", robots: { index: false, follow: false }, referrer: "no-referrer" as const };
export default async function RunningGarminPage() {
  const status = await getCalendarStatus();
  return <main className="min-h-screen bg-bg px-4 py-6 text-ink"><div className="mx-auto max-w-3xl">
    <Link href="/paciente/corrida" className="inline-flex min-h-11 items-center font-bold">← Voltar para Corrida</Link>
    <header className="my-5 rounded-3xl bg-ink-deep p-6 text-white"><p className="text-xs font-bold uppercase tracking-widest text-brand">Garmin Forerunner 55</p><h1 className="mt-2 text-3xl font-black">Leve seus treinos ao relógio</h1><p className="mt-3 text-sm leading-6 text-white/80">Configure uma vez: Nutri Thales → Intervals.icu → Garmin Connect → relógio. Não precisamos da sua senha Garmin.</p></header>
    <CalendarConnection initial={status} />
    <section className="mt-5 rounded-3xl border border-border bg-white p-5"><h2 className="text-xl font-bold">Configuração inicial</h2><ol className="mt-4 list-decimal space-y-4 pl-5 text-sm leading-6">
      <li>Crie sua conta ou entre no <a href="https://intervals.icu" target="_blank" rel="noreferrer noopener" className="font-bold underline">Intervals.icu</a>. Pode usar pelo navegador.</li>
      <li>No calendário de atividades, abra <b>Options / Opções → Add Calendar / Adicionar calendário</b>. Cole o link privado gerado nesta página e marque <b>Events are workouts / Eventos são treinos</b>. Mantenha uma única assinatura deste calendário.</li>
      <li>Nas configurações do Intervals.icu, conecte o <b>Garmin Connect</b> e habilite <b>Upload planned workouts / Enviar treinos planejados</b>, permitindo as corridas. A autorização acontece no site da Garmin.</li>
      <li>Atualize o calendário do Intervals.icu e confira se o próximo treino mostra os blocos e paces. Sincronize o relógio no Garmin Connect e abra o treino programado.</li>
    </ol><p className="mt-5 rounded-xl bg-brand-light p-3 text-sm leading-6">Novos meses só entram no link após a liberação, à meia-noite de Brasília. As alterações de pace aparecem na próxima leitura do calendário pelo Intervals.icu; não há garantia de envio instantâneo. A Garmin recebe os treinos conforme a janela de sincronização do Intervals.icu.</p></section>
    <section className="mt-5 rounded-3xl border border-border bg-white p-5"><h2 className="text-lg font-bold">Antes da primeira corrida</h2><p className="mt-3 text-sm leading-6">Confira um treino no relógio: duração, repetições e faixa de pace de cada bloco. Se houver diferença, siga o plano da área de paciente e avise o treinador. O resultado final depende da leitura dos blocos pelo Intervals.icu e da sincronização do dispositivo.</p><p className="mt-3 text-sm leading-6">Este recurso envia os treinos planejados. Os resultados, a conclusão e o feedback continuam sendo registrados aqui na área de paciente; não há importação automática das atividades Garmin por este link.</p></section>
  </div></main>;
}
