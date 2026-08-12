"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle, CalendarClock, Columns3, Filter, List, MessageCircle,
  Search, UserRound, UsersRound, X,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Input, Label, Textarea } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import { Select } from "@/components/ui/Select";
import { useToast } from "@/contexts/ToastContext";
import { FLOW_GROUPS, FLOW_STAGES, getFlowStage, type FlowStageKey } from "@/lib/fluxo/stages";
import { updateFluxoPacienteAction } from "@/services/fluxo.actions";
import type { FluxoPaciente } from "@/services/fluxo.queries";
import { cn } from "@/utils/cn";
import type { LucideIcon } from "lucide-react";

const stageColors: Record<string, string> = {
  slate: "bg-slate-100 text-slate-700", amber: "bg-amber-100 text-amber-800",
  sky: "bg-sky-100 text-sky-800", rose: "bg-rose-100 text-rose-800",
  green: "bg-emerald-100 text-emerald-800", stone: "bg-stone-100 text-stone-700",
  orange: "bg-orange-100 text-orange-800", red: "bg-red-100 text-red-800",
  violet: "bg-violet-100 text-violet-800",
};

function phoneHref(phone?: string | null) {
  const digits = (phone ?? "").replace(/\D/g, "");
  return digits ? `https://wa.me/${digits.startsWith("55") ? digits : `55${digits}`}` : null;
}

function dateLabel(value?: string | null, withTime = false) {
  if (!value) return "—";
  return new Date(value).toLocaleString("pt-BR", withTime
    ? { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }
    : { day: "2-digit", month: "2-digit", year: "numeric" });
}

function toDateTimeLocal(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function StagePill({ stageKey }: { stageKey?: string | null }) {
  const stage = getFlowStage(stageKey);
  return <span className={cn("inline-flex rounded-full px-2.5 py-1 text-xs font-semibold", stageColors[stage.color])}>{stage.label}</span>;
}

function PatientCard({ patient, onOpen, onMove }: {
  patient: FluxoPaciente;
  onOpen: () => void;
  onMove: (stage: FlowStageKey) => void;
}) {
  const whatsapp = phoneHref(patient.telefone);
  return (
    <article
      draggable
      onDragStart={(event) => event.dataTransfer.setData("text/patient-id", patient.id)}
      className="rounded-lg border border-border bg-surface p-4 shadow-card transition hover:-translate-y-0.5 hover:shadow-image"
    >
      <button onClick={onOpen} className="w-full text-left">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0"><h3 className="truncate font-bold text-ink">{patient.nome || "Paciente sem nome"}</h3><p className="mt-0.5 truncate text-xs text-muted">{patient.plano || "Plano não definido"}</p></div>
          {patient.fluxo_urgente && <AlertTriangle className="size-4 shrink-0 text-danger" aria-label="Urgente" />}
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {patient.modalidade && <Badge>{patient.modalidade}</Badge>}
          <Badge tone="brand">{patient.consultas_realizadas}/{patient.consultas_incluidas} consultas</Badge>
        </div>
        {patient.proxima_consulta && <p className="mt-3 flex items-center gap-1.5 text-xs text-muted"><CalendarClock className="size-3.5" /> Próxima: {dateLabel(patient.proxima_consulta, true)}</p>}
        {patient.fluxo_proxima_acao_em && <p className="mt-1.5 text-xs font-semibold text-warning">Ação: {dateLabel(patient.fluxo_proxima_acao_em, true)}</p>}
      </button>
      <div className="mt-3 flex items-center gap-2 border-t border-border pt-3">
        <Select value={patient.fluxo_etapa} onChange={(event) => onMove(event.target.value as FlowStageKey)} className="py-1.5 text-xs">
          {FLOW_STAGES.map((stage) => <option key={stage.key} value={stage.key}>{stage.label}</option>)}
        </Select>
        {whatsapp && <a href={whatsapp} target="_blank" rel="noreferrer" className="rounded-md border border-border p-2 text-brand-dark hover:bg-brand-light" aria-label="Abrir WhatsApp"><MessageCircle className="size-4" /></a>}
      </div>
    </article>
  );
}

export function FluxoClient({ initialPatients }: { initialPatients: FluxoPaciente[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [patients, setPatients] = useState(initialPatients);
  const [view, setView] = useState<"kanban" | "table">("kanban");
  const [search, setSearch] = useState("");
  const [group, setGroup] = useState("todos");
  const [urgentOnly, setUrgentOnly] = useState(false);
  const [selected, setSelected] = useState<FluxoPaciente | null>(null);
  const [notes, setNotes] = useState("");
  const [nextAction, setNextAction] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => setPatients(initialPatients), [initialPatients]);
  useEffect(() => {
    if (!selected) return;
    setNotes(selected.fluxo_observacoes ?? "");
    setNextAction(toDateTimeLocal(selected.fluxo_proxima_acao_em));
  }, [selected]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return patients.filter((patient) => {
      const stage = getFlowStage(patient.fluxo_etapa);
      return (!query || `${patient.nome} ${patient.email} ${patient.telefone} ${patient.plano}`.toLowerCase().includes(query))
        && (group === "todos" || stage.group === group)
        && (!urgentOnly || patient.fluxo_urgente);
    });
  }, [patients, search, group, urgentOnly]);

  const visibleStages = group === "todos" ? FLOW_STAGES : FLOW_STAGES.filter((stage) => stage.group === group);
  const stats = {
    total: patients.length,
    atendimento: patients.filter((patient) => getFlowStage(patient.fluxo_etapa).group === "atendimento").length,
    acompanhamento: patients.filter((patient) => getFlowStage(patient.fluxo_etapa).group === "acompanhamento").length,
    renovacao: patients.filter((patient) => getFlowStage(patient.fluxo_etapa).group === "renovação").length,
    urgentes: patients.filter((patient) => patient.fluxo_urgente).length,
  };

  async function updatePatient(patient: FluxoPaciente, values: Parameters<typeof updateFluxoPacienteAction>[1]) {
    const previous = patients;
    setPatients((items) => items.map((item) => item.id === patient.id ? {
      ...item,
      ...(values.etapa !== undefined ? { fluxo_etapa: values.etapa } : {}),
      ...(values.urgente !== undefined ? { fluxo_urgente: values.urgente } : {}),
      ...(values.observacoes !== undefined ? { fluxo_observacoes: values.observacoes } : {}),
      ...(values.proximaAcaoEm !== undefined ? { fluxo_proxima_acao_em: values.proximaAcaoEm } : {}),
    } : item));
    const result = await updateFluxoPacienteAction(patient.id, values);
    if (!result.success) {
      setPatients(previous);
      toast({ kind: "error", title: "Não foi possível atualizar", description: result.message });
    }
    return result.success;
  }

  async function saveDetails() {
    if (!selected) return;
    setSaving(true);
    const success = await updatePatient(selected, {
      observacoes: notes || null,
      proximaAcaoEm: nextAction ? new Date(nextAction).toISOString() : null,
    });
    setSaving(false);
    if (success) {
      toast({ kind: "success", title: "Informações do fluxo salvas." });
      setSelected(null);
      router.refresh();
    }
  }

  function dropOnStage(event: React.DragEvent, stage: FlowStageKey) {
    event.preventDefault();
    const id = event.dataTransfer.getData("text/patient-id");
    const patient = patients.find((item) => item.id === id);
    if (patient && patient.fluxo_etapa !== stage) void updatePatient(patient, { etapa: stage });
  }

  return (
    <div>
      <PageHeader title="Fluxo de pacientes" description="Acompanhe cada paciente, do agendamento à renovação do plano." />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {([
          ["Total no fluxo", stats.total, UsersRound], ["Atendimento", stats.atendimento, UserRound],
          ["Acompanhamento", stats.acompanhamento, CalendarClock], ["Renovação", stats.renovacao, Columns3],
          ["Urgentes", stats.urgentes, AlertTriangle],
        ] as [string, number, LucideIcon][]).map(([label, value, Icon]) => (
          <Card key={String(label)}><CardContent className="flex items-center gap-3 pt-6"><div className="rounded-full bg-brand-light p-2.5 text-brand-dark"><Icon className="size-4" /></div><div><p className="text-xl font-bold text-ink">{String(value)}</p><p className="text-xs text-muted">{String(label)}</p></div></CardContent></Card>
        ))}
      </div>

      <Card className="mb-5"><CardContent className="flex flex-col gap-3 pt-6 lg:flex-row lg:items-center">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nome, contato ou plano..." className="pl-9" /></div>
        <div className="flex min-w-48 items-center gap-2"><Filter className="size-4 text-muted" /><Select value={group} onChange={(event) => setGroup(event.target.value)}><option value="todos">Todas as fases</option>{FLOW_GROUPS.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}</Select></div>
        <label className="flex items-center gap-2 whitespace-nowrap text-sm font-semibold text-ink"><input type="checkbox" checked={urgentOnly} onChange={(event) => setUrgentOnly(event.target.checked)} className="size-4 accent-brand" /> Somente urgentes</label>
        <div className="flex rounded-md border border-border p-1"><button onClick={() => setView("kanban")} className={cn("flex items-center gap-1.5 rounded px-3 py-1.5 text-sm font-semibold", view === "kanban" ? "bg-brand-light text-brand-dark" : "text-muted")}><Columns3 className="size-4" /> Kanban</button><button onClick={() => setView("table")} className={cn("flex items-center gap-1.5 rounded px-3 py-1.5 text-sm font-semibold", view === "table" ? "bg-brand-light text-brand-dark" : "text-muted")}><List className="size-4" /> Tabela</button></div>
      </CardContent></Card>

      {view === "kanban" ? (
        <div className="scrollbar-thin flex gap-4 overflow-x-auto pb-5">
          {visibleStages.map((stage) => {
            const stagePatients = filtered.filter((patient) => patient.fluxo_etapa === stage.key);
            return <section key={stage.key} onDragOver={(event) => event.preventDefault()} onDrop={(event) => dropOnStage(event, stage.key)} className="w-[310px] shrink-0 rounded-xl bg-bg-alt p-3">
              <div className="mb-3 flex items-center justify-between"><span className={cn("rounded-full px-2.5 py-1 text-xs font-bold", stageColors[stage.color])}>{stage.label}</span><span className="rounded-full bg-surface px-2 py-0.5 text-xs font-bold text-muted">{stagePatients.length}</span></div>
              <div className="space-y-3">{stagePatients.map((patient) => <PatientCard key={patient.id} patient={patient} onOpen={() => setSelected(patient)} onMove={(etapa) => void updatePatient(patient, { etapa })} />)}{stagePatients.length === 0 && <div className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-xs text-muted">Arraste um paciente para esta etapa</div>}</div>
            </section>;
          })}
        </div>
      ) : (
        <div className="scrollbar-thin overflow-x-auto rounded-lg border border-border bg-surface"><table className="w-full min-w-[1050px] text-left text-sm"><thead className="border-b border-border bg-bg-alt text-xs uppercase tracking-wide text-muted"><tr><th className="px-4 py-3">Paciente</th><th className="px-4 py-3">Etapa atual</th><th className="px-4 py-3">Início do plano</th><th className="px-4 py-3">Consultas</th><th className="px-4 py-3">Modalidade</th><th className="px-4 py-3">Próxima consulta</th><th className="px-4 py-3">Próxima ação</th><th className="px-4 py-3">Contato</th></tr></thead><tbody className="divide-y divide-border">{filtered.map((patient) => <tr key={patient.id} className="hover:bg-bg-alt-2"><td className="px-4 py-3"><button onClick={() => setSelected(patient)} className="font-bold text-ink hover:text-brand-dark">{patient.nome}</button>{patient.fluxo_urgente && <AlertTriangle className="ml-2 inline size-4 text-danger" />}</td><td className="px-4 py-3"><StagePill stageKey={patient.fluxo_etapa} /></td><td className="px-4 py-3 text-muted">{dateLabel(patient.data_inicio)}</td><td className="px-4 py-3 font-semibold">{patient.consultas_realizadas} de {patient.consultas_incluidas}</td><td className="px-4 py-3 text-muted">{patient.modalidade || "—"}</td><td className="px-4 py-3 text-muted">{dateLabel(patient.proxima_consulta, true)}</td><td className="px-4 py-3 text-muted">{dateLabel(patient.fluxo_proxima_acao_em, true)}</td><td className="px-4 py-3">{phoneHref(patient.telefone) ? <a href={phoneHref(patient.telefone)!} target="_blank" rel="noreferrer" className="text-brand-dark hover:underline">WhatsApp</a> : "—"}</td></tr>)}</tbody></table></div>
      )}

      {selected && <div className="fixed inset-0 z-50 flex justify-end bg-ink/40" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelected(null); }}><aside className="h-full w-full max-w-lg overflow-y-auto bg-surface p-6 shadow-dark"><div className="flex items-start justify-between gap-4"><div><p className="eyebrow">Detalhes do fluxo</p><h2 className="mt-1 text-2xl font-bold text-ink">{selected.nome}</h2><p className="mt-1 text-sm text-muted">{selected.email || selected.telefone}</p></div><button onClick={() => setSelected(null)} className="rounded-full p-2 text-muted hover:bg-bg-alt"><X className="size-5" /></button></div>
        <div className="mt-6 space-y-5"><div><Label>Etapa atual</Label><Select value={selected.fluxo_etapa} onChange={(event) => { const etapa = event.target.value as FlowStageKey; setSelected({ ...selected, fluxo_etapa: etapa }); void updatePatient(selected, { etapa }); }}>{FLOW_STAGES.map((stage) => <option key={stage.key} value={stage.key}>{stage.label}</option>)}</Select></div>
          <label className="flex items-center justify-between rounded-lg border border-border p-4"><span><strong className="block text-sm text-ink">Marcar como urgente</strong><span className="text-xs text-muted">Destaca o paciente no fluxo.</span></span><input type="checkbox" checked={selected.fluxo_urgente} onChange={(event) => { const urgente = event.target.checked; setSelected({ ...selected, fluxo_urgente: urgente }); void updatePatient(selected, { urgente }); }} className="size-5 accent-brand" /></label>
          <div><Label>Próxima ação</Label><Input type="datetime-local" value={nextAction} onChange={(event) => setNextAction(event.target.value)} /></div><div><Label>Observações internas</Label><Textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Registre aqui o que precisa ser lembrado no próximo contato..." className="min-h-36" /></div>
          <div className="grid grid-cols-2 gap-3 rounded-lg bg-bg-alt p-4 text-sm"><div><p className="text-xs text-muted">Plano</p><p className="font-bold text-ink">{selected.plano || "Não definido"}</p></div><div><p className="text-xs text-muted">Consultas realizadas</p><p className="font-bold text-ink">{selected.consultas_realizadas} de {selected.consultas_incluidas}</p></div><div><p className="text-xs text-muted">Modalidade</p><p className="font-bold text-ink">{selected.modalidade || "—"}</p></div><div><p className="text-xs text-muted">Próxima consulta</p><p className="font-bold text-ink">{dateLabel(selected.proxima_consulta, true)}</p></div></div>
          <div className="flex flex-wrap gap-2">{phoneHref(selected.telefone) && <a href={phoneHref(selected.telefone)!} target="_blank" rel="noreferrer"><Button variant="outline"><MessageCircle className="size-4" /> Abrir WhatsApp</Button></a>}<a href={`/pacientes/${selected.id}`}><Button variant="ghost"><UserRound className="size-4" /> Abrir perfil</Button></a></div>
          <Button onClick={() => void saveDetails()} disabled={saving} className="w-full">{saving ? "Salvando..." : "Salvar informações"}</Button>
        </div></aside></div>}
    </div>
  );
}
