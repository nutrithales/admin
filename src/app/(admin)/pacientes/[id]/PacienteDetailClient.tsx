"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { CalendarCheck2, CalendarClock, Wallet } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Tabs } from "@/components/ui/Tabs";
import type { Tables } from "@/types/database.types";
import type { ConsultaComProntuario } from "@/services/prontuarios.queries";
import { VisaoGeralTab } from "./VisaoGeralTab";
import { ProntuarioTab } from "./ProntuarioTab";
import { AvaliacoesTab } from "./AvaliacoesTab";
import { PreConsultaTab } from "./PreConsultaTab";
import { AdministrativoTab } from "./AdministrativoTab";
import { Card, CardContent } from "@/components/ui/Card";
import { computeConsultasStats } from "@/lib/clara/consultas";

export function PacienteDetailClient({
  paciente,
  consultas,
  avaliacoes,
  preConsulta,
  pendencias,
  pagamentos,
  historicoFluxo,
}: {
  paciente: Tables<"pacientes">;
  consultas: ConsultaComProntuario[];
  avaliacoes: Tables<"avaliacoes_fisicas">[];
  preConsulta: Tables<"formularios_pre_consulta"> | null;
  pendencias: Tables<"pendencias">[];
  pagamentos: Tables<"pagamentos">[];
  historicoFluxo: Tables<"fluxo_movimentacoes">[];
}) {
  const [tab, setTab] = useState("visao-geral");
  const stats = computeConsultasStats(paciente, consultas);
  const completed = stats.realizadas;
  const scheduled = stats.agendadas;
  const remaining = stats.restantes;

  return (
    <div>
      <Link href="/pacientes" className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink">
        <ArrowLeft className="size-4" /> Pacientes
      </Link>

      <PageHeader
        title={paciente.nome ?? "Paciente"}
        description="Ficha completa do paciente, com cadastro, histórico de consultas, prontuário, avaliações e informações administrativas."
      />

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
