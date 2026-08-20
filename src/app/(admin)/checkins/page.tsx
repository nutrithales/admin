import Link from "next/link";
import { AlertTriangle, CalendarClock, CheckCircle2, Clock3, ExternalLink, MessageSquareText, UsersRound } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { listCheckins } from "@/services/checkins.queries";
import { listPacientesResumo } from "@/services/pacientes.queries";
import { listEnviosFormularios, listFormularios } from "@/services/formularios.queries";
import { getCheckinDashboardResumo, listCheckinAdesaoPacientes, listCheckinAutomacoes } from "@/services/checkin-automacoes.queries";
import { CheckinAutomacoesClient } from "./CheckinAutomacoesClient";

export const metadata = { title: "Check-ins" };

function Card({ label, value, help, icon: Icon }: { label: string; value: number; help: string; icon: any }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div><p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">{label}</p><p className="mt-1 text-2xl font-black">{value}</p><p className="mt-1 text-xs text-muted">{help}</p></div>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10 text-brand"><Icon size={18} /></div>
      </div>
    </div>
  );
}

export default async function CheckinsPage() {
  const [checkins, formularios, pacientes, envios, automacoes, resumo, adesao] = await Promise.all([
    listCheckins(),
    listFormularios(),
    listPacientesResumo(),
    listEnviosFormularios(300),
    listCheckinAutomacoes(),
    getCheckinDashboardResumo(),
    listCheckinAdesaoPacientes(),
  ]);

  const checkinIds = new Set(formularios.filter((f) => f.tipo === "checkin").map((f) => f.id));
  const enviosCheckin = envios.filter((e) => e.formulario?.id && checkinIds.has(e.formulario.id));
  const aguardando = enviosCheckin.filter((e) => e.status === "enviado" || e.status === "visualizado");
  const expiradosRecentes = enviosCheckin.filter((e) => e.status === "expirado").slice(0, 20);
  const paraAnalisar = checkins.filter((c) => !c.revisado);
  const concluidos = checkins.filter((c) => c.revisado);
  const alertasAdesao = adesao.filter((a) => a.faltas_consecutivas >= 2);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Check-ins"
        description="Central de acompanhamento: disparo automático, respostas pendentes, análise clínica, retorno pelo WhatsApp e controle de adesão."
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Card label="Aguardando" value={resumo.aguardando} help="Paciente ainda pode responder" icon={Clock3} />
        <Card label="Para analisar" value={resumo.analisar} help="Resposta recebida e ainda não concluída" icon={MessageSquareText} />
        <Card label="Concluídos" value={resumo.concluidos} help="Análise e retorno finalizados" icon={CheckCircle2} />
        <Card label="Expirados" value={resumo.expirados} help="Prazo terminou sem resposta" icon={AlertTriangle} />
        <Card label="Próximos" value={resumo.proximos} help="Envios já agendados" icon={CalendarClock} />
      </section>

      {alertasAdesao.length > 0 && (
        <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 text-amber-700" size={20} />
            <div className="min-w-0 flex-1">
              <h2 className="font-bold text-amber-900">Atenção de adesão</h2>
              <p className="mt-1 text-sm text-amber-800">Pacientes com 2 ou mais check-ins consecutivos sem resposta.</p>
              <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                {alertasAdesao.map((a) => (
                  <div key={a.paciente_id} className="rounded-2xl bg-white/70 p-3">
                    <p className="font-semibold text-amber-950">{a.nome}</p>
                    <p className="mt-1 text-xs text-amber-800">{a.faltas_consecutivas} ausências seguidas · adesão {a.taxa_resposta}%</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      <CheckinAutomacoesClient formularios={formularios} pacientes={pacientes} automacoes={automacoes} />

      <section className="rounded-3xl border border-border bg-surface p-5 shadow-sm sm:p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand">Fila clínica</p><h2 className="mt-1 text-xl font-bold">Respostas para analisar</h2><p className="mt-1 text-sm text-muted">Ao finalizar o retorno pelo WhatsApp, o check-in deixa esta fila.</p></div>
          <Badge tone={paraAnalisar.length ? "warning" : "success"}>{paraAnalisar.length} pendente{paraAnalisar.length === 1 ? "" : "s"}</Badge>
        </div>
        {paraAnalisar.length === 0 ? <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted">Nenhuma resposta aguardando análise.</p> : (
          <div className="space-y-2">
            {paraAnalisar.map((c) => (
              <div key={c.id} className="flex flex-col gap-3 rounded-2xl border border-border bg-background p-4 sm:flex-row sm:items-center sm:justify-between">
                <div><p className="font-semibold">{c.paciente?.nome ?? "Paciente"}</p><p className="mt-1 text-xs text-muted">Respondido em {c.respondido_em ? new Date(c.respondido_em).toLocaleString("pt-BR") : c.semana ? new Date(`${c.semana}T12:00:00`).toLocaleDateString("pt-BR") : "—"} · score {c.pontuacao ?? "—"}%</p></div>
                <Link href={`/checkins/${c.id}`} className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-foreground px-4 py-2.5 text-sm font-semibold text-background">Analisar e responder <ExternalLink size={14} /></Link>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-3xl border border-border bg-surface p-5 shadow-sm sm:p-6">
          <h2 className="font-bold">Aguardando resposta</h2>
          <p className="mt-1 text-sm text-muted">Sai desta lista assim que o paciente conclui o formulário.</p>
          <div className="mt-4 space-y-2">
            {aguardando.length === 0 ? <p className="rounded-2xl border border-dashed border-border p-5 text-sm text-muted">Nenhum check-in aguardando resposta.</p> : aguardando.slice(0, 30).map((e) => (
              <div key={e.id} className="rounded-2xl border border-border bg-background p-3">
                <div className="flex items-center justify-between gap-3"><p className="font-semibold">{e.paciente?.nome ?? "Paciente"}</p><Badge tone={e.status === "visualizado" ? "brand" : "muted"}>{e.status === "visualizado" ? "Visualizado" : "Enviado"}</Badge></div>
                <p className="mt-1 text-xs text-muted">Prazo: {new Date(e.expira_em).toLocaleString("pt-BR")}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-border bg-surface p-5 shadow-sm sm:p-6">
          <h2 className="font-bold">Sem resposta / expirados</h2>
          <p className="mt-1 text-sm text-muted">Histórico recente de prazos encerrados.</p>
          <div className="mt-4 space-y-2">
            {expiradosRecentes.length === 0 ? <p className="rounded-2xl border border-dashed border-border p-5 text-sm text-muted">Nenhum prazo expirado.</p> : expiradosRecentes.map((e) => (
              <div key={e.id} className="rounded-2xl border border-border bg-background p-3"><p className="font-semibold">{e.paciente?.nome ?? "Paciente"}</p><p className="mt-1 text-xs text-muted">Prazo encerrado em {new Date(e.expira_em).toLocaleString("pt-BR")}</p></div>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-border bg-surface p-5 shadow-sm sm:p-6">
        <div className="mb-4 flex items-center gap-3"><UsersRound className="text-brand" size={20} /><div><h2 className="font-bold">Frequência de resposta por paciente</h2><p className="text-sm text-muted">Taxa calculada sobre check-ins já encerrados: respondidos ou expirados.</p></div></div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-border text-xs uppercase tracking-wide text-muted"><tr><th className="px-3 py-3">Paciente</th><th className="px-3 py-3">Respondidos</th><th className="px-3 py-3">Sem resposta</th><th className="px-3 py-3">Adesão</th><th className="px-3 py-3">Sequência atual</th></tr></thead>
            <tbody className="divide-y divide-border">
              {adesao.map((a) => (
                <tr key={a.paciente_id}><td className="px-3 py-4 font-semibold">{a.nome}</td><td className="px-3 py-4">{a.respondidos}</td><td className="px-3 py-4">{a.expirados}</td><td className="px-3 py-4 font-bold">{a.taxa_resposta}%</td><td className="px-3 py-4">{a.faltas_consecutivas >= 2 ? <Badge tone="warning">{a.faltas_consecutivas} ausências</Badge> : a.faltas_consecutivas === 1 ? "1 ausência" : "Em dia"}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {concluidos.length > 0 && (
        <section className="rounded-3xl border border-border bg-surface p-5 shadow-sm sm:p-6">
          <h2 className="font-bold">Histórico concluído</h2>
          <div className="mt-4 space-y-2">
            {concluidos.slice(0, 30).map((c) => (
              <Link key={c.id} href={`/checkins/${c.id}`} className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-background p-3 hover:border-brand/40"><div><p className="font-semibold">{c.paciente?.nome ?? "Paciente"}</p><p className="text-xs text-muted">{c.semana ? new Date(`${c.semana}T12:00:00`).toLocaleDateString("pt-BR") : "—"}</p></div><Badge tone="success">Concluído</Badge></Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
