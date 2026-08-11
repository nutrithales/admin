"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarCheck2,
  CalendarDays,
  Clock3,
  ExternalLink,
  Loader2,
  MapPin,
  MessageCircle,
  RefreshCw,
  Trash2,
  UserRound,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { useToast } from "@/contexts/ToastContext";
import { CONSULTA_STATUS_LABEL, CONSULTA_STATUS_TONE, type ConsultaStatus } from "@/lib/clara/consultas";

interface AgendaEvent {
  id: string;
  title?: string;
  start: string;
  end?: string;
  description?: string;
  location?: string;
  status?: ConsultaStatus;
  consultationId?: string | null;
  patientId?: string | null;
}

interface PatientInfo {
  paciente?: string;
  whatsapp?: string;
  email?: string;
  plano?: string;
  modalidade?: string;
}

function parseDescription(description = ""): PatientInfo {
  const aliases: Record<string, keyof PatientInfo> = {
    paciente: "paciente",
    whatsapp: "whatsapp",
    "whats app": "whatsapp",
    email: "email",
    "e-mail": "email",
    plano: "plano",
    modalidade: "modalidade",
  };
  const info: PatientInfo = {};

  for (const line of description.split("\n")) {
    const separator = line.indexOf(":");
    if (separator < 0) continue;
    const label = line.slice(0, separator).trim().toLowerCase();
    const key = aliases[label];
    if (key) info[key] = line.slice(separator + 1).trim();
  }

  return info;
}

function whatsappHref(phone?: string) {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (!digits) return null;
  return `https://wa.me/${digits.startsWith("55") ? digits : `55${digits}`}`;
}

export function AgendaClient() {
  const { toast } = useToast();
  const [events, setEvents] = useState<AgendaEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cancelling, setCancelling] = useState<AgendaEvent | null>(null);

  const loadEvents = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/agenda", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message ?? "Não foi possível carregar a agenda.");
      setEvents((data.events ?? []).sort((a: AgendaEvent, b: AgendaEvent) => +new Date(a.start) - +new Date(b.start)));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Não foi possível carregar a agenda.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadEvents();
  }, [loadEvents]);

  const upcoming = useMemo(() => events.filter((event) => new Date(event.end ?? event.start) >= new Date()), [events]);
  const today = new Date();
  const todayCount = upcoming.filter((event) => new Date(event.start).toDateString() === today.toDateString()).length;
  const weekLimit = new Date(today);
  weekLimit.setDate(weekLimit.getDate() + 7);
  const weekCount = upcoming.filter((event) => new Date(event.start) <= weekLimit).length;

  async function cancelEvent() {
    if (!cancelling) return;
    const response = await fetch(`/api/agenda?id=${encodeURIComponent(cancelling.id)}`, { method: "DELETE" });
    const data = await response.json();
    if (!response.ok) {
      toast({ kind: "error", title: data.message ?? "Não foi possível cancelar o agendamento." });
      return;
    }
    toast({ kind: "success", title: "Agendamento cancelado na agenda." });
    setCancelling(null);
    await loadEvents();
  }

  async function updateStatus(event: AgendaEvent, status: ConsultaStatus, successMessage: string) {
    const response = await fetch(`/api/agenda?id=${encodeURIComponent(event.id)}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const data = await response.json();
    toast({
      kind: response.ok ? "success" : "error",
      title: response.ok ? successMessage : (data.message ?? "Erro ao atualizar consulta."),
    });
    if (response.ok) await loadEvents();
  }

  return (
    <div>
      <PageHeader
        title="Agenda de atendimentos"
        description="Acompanhe e gerencie os agendamentos recebidos pelo site Nutri Thales."
        actions={
          <>
            <Button variant="ghost" onClick={() => void loadEvents()} disabled={loading}>
              <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} /> Atualizar
            </Button>
            <a href="https://www.nutrithales.com.br/agenda/" target="_blank" rel="noreferrer">
              <Button variant="outline">
                <ExternalLink className="size-4" /> Abrir agenda pública
              </Button>
            </a>
          </>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        {[
          { label: "Hoje", value: todayCount, icon: Clock3 },
          { label: "Próximos 7 dias", value: weekCount, icon: CalendarDays },
          { label: "Próximos atendimentos", value: upcoming.length, icon: CalendarCheck2 },
        ].map(({ label, value, icon: Icon }) => (
          <Card key={label}>
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="rounded-full bg-brand-light p-3 text-brand-dark"><Icon className="size-5" /></div>
              <div><p className="text-2xl font-bold text-ink">{value}</p><p className="text-sm text-muted">{label}</p></div>
            </CardContent>
          </Card>
        ))}
      </div>

      {loading ? (
        <Card><CardContent className="flex items-center justify-center gap-2 py-16 text-muted"><Loader2 className="size-5 animate-spin" /> Carregando agenda...</CardContent></Card>
      ) : error ? (
        <Card><CardContent className="py-10 text-center"><p className="font-semibold text-danger">{error}</p><p className="mt-2 text-sm text-muted">Confira as variáveis AGENDA_API_URL e AGENDA_ADMIN_PASSWORD na Vercel deste painel.</p><Button className="mt-5" onClick={() => void loadEvents()}>Tentar novamente</Button></CardContent></Card>
      ) : upcoming.length === 0 ? (
        <EmptyState icon={CalendarCheck2} title="Nenhum agendamento futuro" description="Os novos agendamentos realizados no site aparecerão aqui." />
      ) : (
        <div className="space-y-3">
          {upcoming.map((event) => {
            const start = new Date(event.start);
            const end = event.end ? new Date(event.end) : null;
            const info = parseDescription(event.description);
            const patient = info.paciente || event.title?.replace(/^Consulta\s*[-–—:]?\s*/i, "") || "Paciente";
            const whatsapp = whatsappHref(info.whatsapp);
            return (
              <Card key={event.id}>
                <CardContent className="flex flex-col gap-5 pt-6 lg:flex-row lg:items-center">
                  <div className="flex min-w-28 items-center gap-3 lg:block lg:text-center">
                    <div className="text-2xl font-bold text-ink">{start.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}</div>
                    <div className="text-sm font-semibold text-brand-dark">{start.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}{end ? `–${end.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}` : ""}</div>
                  </div>
                  <div className="min-w-0 flex-1 border-border lg:border-l lg:pl-6">
                    <div className="flex flex-wrap items-center gap-2"><UserRound className="size-4 text-muted" /><h2 className="font-bold text-ink">{patient}</h2>{info.plano && <Badge tone="brand">{info.plano}</Badge>}{info.modalidade && <Badge>{info.modalidade}</Badge>}<Badge tone={event.status ? CONSULTA_STATUS_TONE[event.status] : "info"}>{event.status ? CONSULTA_STATUS_LABEL[event.status] : "Agendada"}</Badge></div>
                    <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted">{info.email && <span>{info.email}</span>}{info.whatsapp && <span>{info.whatsapp}</span>}{event.location && <span className="inline-flex items-center gap-1"><MapPin className="size-3.5" />{event.location}</span>}</div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {whatsapp && <a href={whatsapp} target="_blank" rel="noreferrer"><Button variant="ghost" size="sm"><MessageCircle className="size-4" /> WhatsApp</Button></a>}
                    {event.patientId && <a href={`/pacientes/${event.patientId}`}><Button variant="ghost" size="sm"><UserRound className="size-4" /> Perfil</Button></a>}
                    {event.consultationId && event.status === "agendada" && <Button variant="outline" size="sm" onClick={() => void updateStatus(event, "confirmada", "Consulta confirmada.")}><CalendarCheck2 className="size-4" /> Confirmar</Button>}
                    {event.consultationId && event.status !== "realizada" && <Button variant="secondary" size="sm" onClick={() => void updateStatus(event, "realizada", "Consulta marcada como realizada.")}><CalendarCheck2 className="size-4" /> Marcar realizada</Button>}
                    <Button variant="danger" size="sm" onClick={() => setCancelling(event)}><Trash2 className="size-4" /> Cancelar</Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={!!cancelling}
        onClose={() => setCancelling(null)}
        onConfirm={cancelEvent}
        title="Cancelar agendamento"
        description="O evento será removido da sua agenda do Google. Esta ação não envia uma mensagem automática ao paciente."
        confirmLabel="Cancelar agendamento"
      />
    </div>
  );
}
