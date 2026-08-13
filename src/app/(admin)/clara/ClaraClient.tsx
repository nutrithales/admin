"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CalendarClock,
  ClipboardCheck,
  Wallet,
  UserPlus,
  CalendarPlus,
  CheckCircle2,
  ClipboardList,
  MessageSquareText,
  MessageCircle,
  ArrowRightLeft,
  RefreshCcw,
  ExternalLink,
  AlertTriangle,
  Clock,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/contexts/ToastContext";
import type { Tables } from "@/types/database.types";
import type { ConsultaDoDia } from "@/services/clara.queries";
import type { PendenciaComPaciente } from "@/services/pendencias.queries";
import type { TarefaComPaciente } from "@/services/tarefas.queries";
import type { LeadFollowupPendente } from "@/services/leads.queries";
import { resolverPendenciaAction } from "@/services/pendencias.actions";
import { concluirTarefaAction } from "@/services/tarefas.actions";
import { updateConsultaStatusAction } from "@/services/consultas.actions";
import { prepararMensagemAction } from "@/services/clara.actions";
import { enviarCheckinAction } from "@/services/checkins.actions";
import { updateFluxoPacienteAction } from "@/services/fluxo.actions";
import { registrarFollowupEnviadoAction } from "@/services/leads.actions";
import { followupMessage } from "@/lib/leads/followups";
import { onlyDigits } from "@/lib/agenda/parse-description";
import {
  PENDENCIA_TIPO_LABEL,
  PENDENCIA_MENSAGEM_SUGERIDA,
  PENDENCIA_ACAO_DIRETA,
  type PendenciaTipo,
} from "@/lib/clara/pendencias-engine";
import {
  CONSULTA_STATUS_LABEL,
  CONSULTA_STATUS_TONE,
  type ConsultaStatus,
} from "@/lib/clara/consultas";
import { ComandosBox } from "./ComandosBox";
import { AdiarPendenciaModal } from "./AdiarPendenciaModal";
import { TarefaFormModal } from "./TarefaFormModal";
import { PagamentoFormModal } from "./PagamentoFormModal";
import { EnviarCheckinModal, RegistrarRespostaCheckinModal } from "./CheckinModals";
import { MensagemPrepararModal } from "./MensagemPrepararModal";
import { MoverFluxoModal } from "./MoverFluxoModal";
import { PacienteFormModal } from "../pacientes/PacienteFormModal";
import { ConsultaFormModal } from "../consultas/ConsultaFormModal";

const PRIORIDADE_TONE = { alta: "danger", media: "warning", baixa: "muted" } as const;

export interface ClaraClientProps {
  consultasHoje: ConsultaDoDia[];
  pendencias: PendenciaComPaciente[];
  tarefas: TarefaComPaciente[];
  pacientesResumo: { id: string; auth_id: string; nome: string | null; fluxo_etapa: string }[];
  pacientesParaConsulta: { id: string; nome: string }[];
  mensagens: Tables<"mensagens_modelos">[];
  leadFollowups: LeadFollowupPendente[];
}

type ModalAberto =
  | null
  | "paciente"
  | "consulta"
  | "pagamento"
  | "enviar-checkin"
  | "resposta-checkin"
  | "tarefa"
  | "mensagem"
  | "fluxo";

export function ClaraClient({
  consultasHoje,
  pendencias,
  tarefas,
  pacientesResumo,
  pacientesParaConsulta,
  mensagens,
  leadFollowups,
}: ClaraClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [modalAberto, setModalAberto] = useState<ModalAberto>(null);
  const [adiando, setAdiando] = useState<string | null>(null);
  const [enviandoWhatsapp, setEnviandoWhatsapp] = useState<string | null>(null);
  const [pendenciaResolvendo, setPendenciaResolvendo] = useState<PendenciaComPaciente | null>(null);

  function refresh() {
    router.refresh();
  }

  async function resolver(id: string) {
    const r = await resolverPendenciaAction(id);
    toast({ kind: r.success ? "success" : "error", title: r.message });
    refresh();
  }

  async function concluirTarefa(id: string) {
    const r = await concluirTarefaAction(id);
    toast({ kind: r.success ? "success" : "error", title: r.message });
    refresh();
  }

  async function mudarStatusConsulta(id: string, status: ConsultaStatus) {
    const r = await updateConsultaStatusAction(id, status);
    toast({ kind: r.success ? "success" : "error", title: r.message });
    refresh();
  }

  async function abrirWhatsappLead(f: LeadFollowupPendente) {
    const digitos = onlyDigits(f.lead.telefone);
    if (!digitos) return toast({ kind: "error", title: "Lead sem WhatsApp cadastrado." });
    const numero = digitos.startsWith("55") ? digitos : `55${digitos}`;
    const corpo = followupMessage(f.mensagem, f.lead.nome);
    const aba = window.open(`https://wa.me/${numero}?text=${encodeURIComponent(corpo)}`, "_blank");
    if (!aba) return toast({ kind: "error", title: "O navegador bloqueou a aba do WhatsApp." });
    const r = await registrarFollowupEnviadoAction(f.lead.id, f.dia);
    toast({
      kind: r.success ? "success" : "error",
      title: r.success ? `${f.etiqueta} aberto no WhatsApp.` : r.message,
    });
    refresh();
  }

  async function abrirWhatsappDaPendencia(p: PendenciaComPaciente) {
    const chave = PENDENCIA_MENSAGEM_SUGERIDA[p.tipo as PendenciaTipo];
    if (!chave || !p.paciente) return;
    const digitos = onlyDigits(p.paciente.telefone);
    if (!digitos) return toast({ kind: "error", title: "Paciente sem telefone/WhatsApp cadastrado." });
    const aba = window.open("", "_blank");
    setEnviandoWhatsapp(p.id);
    const resultado = await prepararMensagemAction(p.paciente.id, chave);
    setEnviandoWhatsapp(null);
    if (resultado.erro) {
      toast({ kind: "error", title: resultado.erro });
      aba?.close();
      return;
    }
    const numero = digitos.startsWith("55") ? digitos : `55${digitos}`;
    if (aba) aba.location.href = `https://wa.me/${numero}?text=${encodeURIComponent(resultado.corpo)}`;
    else return toast({ kind: "error", title: "O navegador bloqueou a aba do WhatsApp." });

    const acao = PENDENCIA_ACAO_DIRETA[p.tipo as PendenciaTipo];
    if (acao === "enviar_checkin" && p.paciente.auth_id) await enviarCheckinAction(p.paciente.auth_id);
    else if (acao === "avancar_checkin_3_dias")
      await updateFluxoPacienteAction(p.paciente.id, { etapa: "09_checkin_3_dias" });
    else if (acao === "avancar_checkin_7_dias")
      await updateFluxoPacienteAction(p.paciente.id, { etapa: "10_checkin_7_dias" });
    else if (acao === "avancar_reconsulta")
      await updateFluxoPacienteAction(p.paciente.id, { etapa: "11_confirmar_reconsulta" });
    else if (acao === "avancar_proposta_renovacao")
      await updateFluxoPacienteAction(p.paciente.id, { etapa: "13_proposta_renovacao" });
    else if (acao === "avancar_reativacao")
      await updateFluxoPacienteAction(p.paciente.id, { etapa: "15_reativacao_pendente" });
    refresh();
  }

  const naoConfirmadas = pendencias.filter((p) => p.tipo === "consulta_nao_confirmada").length;
  const checkinsPendentes = pendencias.filter(
    (p) => p.tipo === "checkin_nao_respondido" || p.tipo === "checkin_pendente_envio",
  ).length;
  const planosProximosFim = pendencias.filter((p) =>
    ["plano_proximo_fim", "plano_finalizado", "renovacao_proposta_pendente", "reativacao_pendente"].includes(p.tipo),
  ).length;
  const semProximaConsulta = pendencias.filter((p) => p.tipo === "sem_proxima_consulta").length;
  const pacientesParaModais = pacientesResumo.map((p) => ({ id: p.id, nome: p.nome }));
  const pacientesComAuth = pacientesResumo.map((p) => ({ authId: p.auth_id, id: p.id, nome: p.nome }));

  return (
    <div>
      <PageHeader
        title="Maria — Secretária Virtual"
        description="Assistente operacional do consultório. Decisões clínicas são sempre do Thales; a Maria só organiza o administrativo."
        actions={
          <Button variant="ghost" onClick={refresh}>
            <RefreshCcw className="size-4" /> Atualizar
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        <StatCard label="Consultas hoje" value={consultasHoje.length} icon={CalendarClock} />
        <StatCard label="Não confirmadas" value={naoConfirmadas} icon={AlertTriangle} tone="muted" />
        <StatCard label="Follow-ups leads" value={leadFollowups.length} icon={MessageCircle} />
        <StatCard label="Check-ins pendentes" value={checkinsPendentes} icon={ClipboardCheck} />
        <StatCard label="Planos perto do fim" value={planosProximosFim} icon={Wallet} tone="ink" />
        <StatCard label="Sem próxima consulta" value={semProximaConsulta} icon={Clock} tone="muted" />
        <StatCard label="Tarefas pendentes" value={tarefas.length} icon={ClipboardList} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <Card>
            <div className="flex items-center justify-between p-6 pb-4">
              <h2 className="text-base font-bold text-ink">Resumo do dia</h2>
              <Link href="/agenda" className="text-sm font-semibold text-brand-dark hover:underline">
                Ver agenda completa
              </Link>
            </div>
            <div className="px-6 pb-6">
              {consultasHoje.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted">Nenhuma consulta hoje.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {consultasHoje.map((c) => (
                    <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                      <div>
                        <p className="text-sm font-semibold text-ink">{c.hora} — {c.paciente}</p>
                        <p className="text-xs text-muted">{c.tipo ?? "Consulta"}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge tone={CONSULTA_STATUS_TONE[c.status as ConsultaStatus] ?? "muted"}>
                          {CONSULTA_STATUS_LABEL[c.status as ConsultaStatus] ?? c.status ?? "—"}
                        </Badge>
                        {c.status === "agendada" && (
                          <Button variant="ghost" size="sm" onClick={() => void mudarStatusConsulta(c.id, "confirmada")}>
                            Confirmar
                          </Button>
                        )}
                        {(c.status === "agendada" || c.status === "confirmada") && (
                          <Button variant="ghost" size="sm" onClick={() => void mudarStatusConsulta(c.id, "realizada")}>
                            Concluir
                          </Button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between p-6 pb-4">
              <h2 className="text-base font-bold text-ink">Follow-ups comerciais</h2>
              <Link href="/leads" className="text-sm font-semibold text-brand-dark hover:underline">
                Ver kanban
              </Link>
            </div>
            <div className="px-6 pb-6">
              {leadFollowups.length === 0 ? (
                <EmptyState
                  icon={CheckCircle2}
                  title="Nenhum follow-up vencido"
                  description="A Maria mostrará aqui somente as mensagens que já estiverem na data de envio."
                />
              ) : (
                <ul className="flex flex-col gap-3">
                  {leadFollowups.map((f) => (
                    <li key={`${f.lead.id}-${f.dia}`} className="rounded-lg border border-border p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="flex gap-2">
                            <Badge tone="brand">{f.etiqueta}</Badge>
                            <Badge tone="warning">Enviar hoje</Badge>
                          </div>
                          <p className="mt-2 font-semibold text-ink">{f.lead.nome}</p>
                          <p className="text-sm text-muted">{f.titulo}</p>
                          <p className="mt-3 whitespace-pre-line rounded-md bg-bg-alt p-3 text-sm text-ink">
                            {followupMessage(f.mensagem, f.lead.nome)}
                          </p>
                        </div>
                        <Button size="sm" onClick={() => void abrirWhatsappLead(f)}>
                          <MessageCircle className="size-4" /> Enviar no WhatsApp
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between p-6 pb-4">
              <h2 className="text-base font-bold text-ink">Central de pendências</h2>
              <span className="text-sm text-muted">{pendencias.length} em aberto</span>
            </div>
            <div className="px-6 pb-6">
              {pendencias.length === 0 ? (
                <EmptyState icon={CheckCircle2} title="Tudo em dia" description="Nenhuma pendência administrativa no momento." />
              ) : (
                <ul className="flex flex-col gap-3">
                  {pendencias.map((p) => (
                    <li key={p.id} className="rounded-lg border border-border p-4">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge tone={PRIORIDADE_TONE[p.prioridade as keyof typeof PRIORIDADE_TONE] ?? "muted"}>
                              {p.prioridade}
                            </Badge>
                            <Badge tone="brand">{PENDENCIA_TIPO_LABEL[p.tipo as PendenciaTipo] ?? p.tipo}</Badge>
                          </div>
                          <p className="mt-1.5 text-sm font-semibold text-ink">{p.paciente?.nome ?? "Consultório"}</p>
                          <p className="text-sm text-muted">{p.motivo}</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {PENDENCIA_MENSAGEM_SUGERIDA[p.tipo as PendenciaTipo] && p.paciente && (
                            <Button
                              size="sm"
                              loading={enviandoWhatsapp === p.id}
                              onClick={() => void abrirWhatsappDaPendencia(p)}
                            >
                              <MessageCircle className="size-3.5" /> WhatsApp
                            </Button>
                          )}
                          {p.paciente && (
                            <Link href={`/pacientes/${p.paciente.id}`}>
                              <Button variant="ghost" size="sm">
                                <ExternalLink className="size-3.5" /> Perfil
                              </Button>
                            </Link>
                          )}
                          <Button variant="outline" size="sm" onClick={() => setAdiando(p.id)}>
                            Adiar
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => (p.paciente ? setPendenciaResolvendo(p) : void resolver(p.id))}
                          >
                            Resolver
                          </Button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Card>

          {tarefas.length > 0 && (
            <Card>
              <div className="p-6 pb-4">
                <h2 className="text-base font-bold text-ink">Tarefas pendentes</h2>
              </div>
              <div className="px-6 pb-6">
                <ul className="flex flex-col gap-2">
                  {tarefas.map((t) => (
                    <li key={t.id} className="flex items-center justify-between gap-3 rounded-lg border border-border px-4 py-2.5">
                      <div>
                        <p className="text-sm font-semibold text-ink">{t.titulo}</p>
                        <p className="text-xs text-muted">
                          {t.paciente?.nome ? `${t.paciente.nome} — ` : ""}
                          {t.prazo ? `prazo ${new Date(t.prazo).toLocaleDateString("pt-BR")}` : "sem prazo"}
                        </p>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => void concluirTarefa(t.id)}>
                        <CheckCircle2 className="size-4" /> Concluir
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>
            </Card>
          )}
        </div>

        <div className="flex flex-col gap-6">
          <ComandosBox />
          <Card>
            <div className="p-6 pb-4">
              <h2 className="text-base font-bold text-ink">Ações rápidas</h2>
            </div>
            <div className="grid grid-cols-1 gap-2 px-6 pb-6">
              <QuickAction icon={UserPlus} label="Cadastrar paciente" onClick={() => setModalAberto("paciente")} />
              <QuickAction icon={CalendarPlus} label="Agendar consulta" onClick={() => setModalAberto("consulta")} />
              <QuickAction icon={Wallet} label="Registrar pagamento" onClick={() => setModalAberto("pagamento")} />
              <QuickAction icon={ClipboardCheck} label="Enviar check-in" onClick={() => setModalAberto("enviar-checkin")} />
              <QuickAction icon={ClipboardList} label="Criar tarefa" onClick={() => setModalAberto("tarefa")} />
              <QuickAction icon={MessageSquareText} label="Preparar mensagem" onClick={() => setModalAberto("mensagem")} />
              <QuickAction icon={ArrowRightLeft} label="Mover no Fluxo" onClick={() => setModalAberto("fluxo")} />
            </div>
          </Card>
        </div>
      </div>

      <PacienteFormModal open={modalAberto === "paciente"} onClose={() => setModalAberto(null)} onSaved={refresh} />
      <ConsultaFormModal
        open={modalAberto === "consulta"}
        onClose={() => setModalAberto(null)}
        onSaved={refresh}
        pacientes={pacientesParaConsulta}
      />
      <PagamentoFormModal
        open={modalAberto === "pagamento"}
        onClose={() => setModalAberto(null)}
        onSaved={refresh}
        pacientes={pacientesParaModais}
      />
      <EnviarCheckinModal
        open={modalAberto === "enviar-checkin"}
        onClose={() => setModalAberto(null)}
        onSaved={refresh}
        pacientes={pacientesComAuth}
      />
      <RegistrarRespostaCheckinModal
        open={modalAberto === "resposta-checkin"}
        onClose={() => setModalAberto(null)}
        onSaved={refresh}
        pacientes={pacientesComAuth}
      />
      <TarefaFormModal
        open={modalAberto === "tarefa"}
        onClose={() => setModalAberto(null)}
        onSaved={refresh}
        pacientes={pacientesParaModais}
      />
      <MensagemPrepararModal
        open={modalAberto === "mensagem"}
        onClose={() => setModalAberto(null)}
        pacientes={pacientesParaModais}
        modelos={mensagens}
      />
      <MoverFluxoModal
        open={modalAberto === "fluxo"}
        onClose={() => setModalAberto(null)}
        onSaved={refresh}
        pacientes={pacientesResumo}
      />
      <MoverFluxoModal
        open={Boolean(pendenciaResolvendo)}
        onClose={() => setPendenciaResolvendo(null)}
        onSaved={refresh}
        pacientes={pacientesResumo}
        pacienteInicial={pendenciaResolvendo?.paciente?.id ?? null}
        pendenciaId={pendenciaResolvendo?.id ?? null}
      />
      <AdiarPendenciaModal pendenciaId={adiando} onClose={() => setAdiando(null)} onSaved={refresh} />
    </div>
  );
}

function QuickAction({
  icon: Icon,
  label,
  onClick,
  href,
}: {
  icon: typeof UserPlus;
  label: string;
  onClick?: () => void;
  href?: string;
}) {
  const content = (
    <div className="flex w-full items-center gap-2.5 rounded-md border border-border px-4 py-3 text-sm font-semibold text-ink transition-colors hover:border-brand hover:bg-brand-light">
      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-brand-light text-brand-dark">
        <Icon className="size-4" />
      </span>
      {label}
    </div>
  );
  if (href) return <Link href={href}>{content}</Link>;
  return (
    <button type="button" onClick={onClick} className="text-left">
      {content}
    </button>
  );
}
