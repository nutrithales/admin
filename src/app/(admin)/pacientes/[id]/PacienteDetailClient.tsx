"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, CalendarCheck2, CalendarClock, UserCheck, UserX, Wallet } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Tabs } from "@/components/ui/Tabs";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/contexts/ToastContext";
import type { Tables } from "@/types/database.types";
import type { ConsultaComProntuario } from "@/services/prontuarios.queries";
import { setPacienteStatusAction } from "@/services/pacientes.actions";
import { VisaoGeralTab } from "./VisaoGeralTab";
import { ProntuarioTab } from "./ProntuarioTab";
import { AvaliacoesTab } from "./AvaliacoesTab";
import { PreConsultaTab } from "./PreConsultaTab";
import { AdministrativoTab } from "./AdministrativoTab";
import { TreinosTab } from "./TreinosTab";
import { Card, CardContent } from "@/components/ui/Card";
import { computeConsultasStats } from "@/lib/clara/consultas";

export function PacienteDetailClient({ paciente, consultas, avaliacoes, preConsulta, pendencias, pagamentos, historicoFluxo }: {
  paciente: Tables<"pacientes">;
  consultas: ConsultaComProntuario[];
  avaliacoes: Tables<"avaliacoes_fisicas">[];
  preConsulta: Tables<"formularios_pre_consulta"> | null;
  pendencias: Tables<"pendencias">[];
  pagamentos: Tables<"pagamentos">[];
  historicoFluxo: Tables<"fluxo_movimentacoes">[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [tab, setTab] = useState("visao-geral");
  const [changingStatus, setChangingStatus] = useState(false);
  const stats = computeConsultasStats(paciente, consultas);
  const completed = stats.realizadas;
  const scheduled = stats.agendadas;
  const remaining = stats.restantes;
  const isInactive = paciente.status === "inativo";

  async function handleStatusChange() {
    const nextStatus = isInactive ? "ativo" : "inativo";

    if (!isInactive) {
      const confirmed = window.confirm(
        "Tornar este paciente inativo? O acesso dele à área do paciente também será desativado.",
      );
      if (!confirmed) return;
    }

    setChangingStatus(true);
    const result = await setPacienteStatusAction(paciente.id, nextStatus);
    setChangingStatus(false);

    if (!result.success) {
      toast({ kind: "error", title: "Não foi possível alterar o status", description: result.message });
      return;
    }

    toast({ kind: "success", title: result.message });
    router.refresh();
  }

  return (
    <div>
      <Link href="/pacientes" className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink">
        <ArrowLeft className="size-4" /> Pacientes
      </Link>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <PageHeader
          title={paciente.nome ?? "Paciente"}
          description="Ficha completa do paciente, com cadastro, histórico de consultas, prontuário, avaliações, treinos e informações administrativas."
        />
        <Button
          type="button"
          size="sm"
          variant={isInactive ? "outline" : "danger"}
          loading={changingStatus}
          onClick={handleStatusChange}
          className="shrink-0"
        >
          {isInactive ? <UserCheck className="size-4" /> : <UserX className="size-4" />}
          {isInactive ? "Reativar paciente" : "Tornar inativo"}
        </Button>
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        {[
          { label: paciente.plano || "Sem plano definido", value: `${completed}/${paciente.consultas_incluidas}`, detail: "consultas realizadas", icon: Wallet },
          { label: "Saldo disponível", value: remaining, detail: "consultas restantes", icon: CalendarCheck2 },
          { label: "Próximas consultas", value: scheduled, detail: "agendamentos ativos", icon: CalendarClock },
        ].map(({ label, value, detail, icon: Icon }) => (
          <Card key={label}><CardContent className="flex items-center gap-3 pt-6"><div className="rounded-full bg-brand-light p-3 text-brand-dark"><Icon className="size-5" /></div><div><p className="text-xs font-semibold text-muted">{label}</p><p className="text-xl font-bold text-ink">{value}</p><p className="text-xs text-muted">{detail}</p></div></CardContent></Card>
        ))}
      </div>

      <Tabs
        className="mb-6"
        value={tab}
        onChange={setTab}
        items={[
          { key: "visao-geral", label: "Visão geral" },
          { key: "prontuario", label: "Prontuário" },
          { key: "avaliacoes", label: "Avaliações físicas" },
          { key: "treinos", label: "Treinos" },
          { key: "pre-consulta", label: "Pré-consulta" },
          { key: "administrativo", label: "Administrativo (Clara)" },
        ]}
      />

      {tab === "visao-geral" ? (
        <VisaoGeralTab paciente={paciente} consultas={consultas} />
      ) : tab === "prontuario" ? (
        <ProntuarioTab consultas={consultas} pacienteId={paciente.id} />
      ) : tab === "avaliacoes" ? (
        <AvaliacoesTab avaliacoes={avaliacoes} authId={paciente.auth_id} />
      ) : tab === "treinos" ? (
        <TreinosTab pacienteId={paciente.id} />
      ) : tab === "pre-consulta" ? (
        <PreConsultaTab formulario={preConsulta} paciente={paciente} />
      ) : (
        <AdministrativoTab
          pacienteId={paciente.id}
          fluxoEtapa={paciente.fluxo_etapa}
          fluxoUrgente={paciente.fluxo_urgente}
          fluxoProximaAcaoEm={paciente.fluxo_proxima_acao_em}
          observacoes={paciente.fluxo_observacoes}
          pendencias={pendencias}
          pagamentos={pagamentos}
          historicoFluxo={historicoFluxo}
        />
      )}
    </div>
  );
}
