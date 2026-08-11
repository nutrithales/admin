"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { CalendarCheck2, CalendarClock, Wallet } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Tabs } from "@/components/ui/Tabs";
import type { Tables } from "@/types/database.types";
import type { ConsultaComProntuario } from "@/services/prontuarios.queries";
import { ProntuarioTab } from "./ProntuarioTab";
import { AvaliacoesTab } from "./AvaliacoesTab";
import { PreConsultaTab } from "./PreConsultaTab";
import { Card, CardContent } from "@/components/ui/Card";

export function PacienteDetailClient({
  paciente,
  consultas,
  avaliacoes,
  preConsulta,
}: {
  paciente: Tables<"pacientes">;
  consultas: ConsultaComProntuario[];
  avaliacoes: Tables<"avaliacoes_fisicas">[];
  preConsulta: Tables<"formularios_pre_consulta"> | null;
}) {
  const [tab, setTab] = useState("prontuario");
  const completed = paciente.consultas_realizadas_iniciais + consultas.filter((item) => item.status === "realizada").length;
  const scheduled = consultas.filter((item) => item.status === "agendada").length;
  const remaining = Math.max(0, paciente.consultas_incluidas - completed);

  return (
    <div>
      <Link href="/pacientes" className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink">
        <ArrowLeft className="size-4" /> Pacientes
      </Link>

      <PageHeader
        title={paciente.nome ?? "Paciente"}
        description="Área privada — prontuário e avaliações físicas nunca são visíveis ao paciente, exceto o que você decidir disponibilizar."
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
          { key: "prontuario", label: "Prontuário" },
          { key: "avaliacoes", label: "Avaliações físicas" },
          { key: "pre-consulta", label: "Pré-consulta" },
        ]}
      />

      {tab === "prontuario" ? (
        <ProntuarioTab consultas={consultas} pacienteId={paciente.id} />
      ) : tab === "avaliacoes" ? (
        <AvaliacoesTab avaliacoes={avaliacoes} authId={paciente.auth_id} />
      ) : (
        <PreConsultaTab formulario={preConsulta} />
      )}
    </div>
  );
}
