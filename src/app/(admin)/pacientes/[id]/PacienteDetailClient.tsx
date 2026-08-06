"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Tabs } from "@/components/ui/Tabs";
import type { Tables } from "@/types/database.types";
import type { ConsultaComProntuario } from "@/services/prontuarios.queries";
import { ProntuarioTab } from "./ProntuarioTab";
import { AvaliacoesTab } from "./AvaliacoesTab";

export function PacienteDetailClient({
  paciente,
  consultas,
  avaliacoes,
}: {
  paciente: Tables<"pacientes">;
  consultas: ConsultaComProntuario[];
  avaliacoes: Tables<"avaliacoes_fisicas">[];
}) {
  const [tab, setTab] = useState("prontuario");

  return (
    <div>
      <Link href="/pacientes" className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink">
        <ArrowLeft className="size-4" /> Pacientes
      </Link>

      <PageHeader
        title={paciente.nome ?? "Paciente"}
        description="Área privada — prontuário e avaliações físicas nunca são visíveis ao paciente, exceto o que você decidir disponibilizar."
      />

      <Tabs
        className="mb-6"
        value={tab}
        onChange={setTab}
        items={[
          { key: "prontuario", label: "Prontuário" },
          { key: "avaliacoes", label: "Avaliações físicas" },
        ]}
      />

      {tab === "prontuario" ? (
        <ProntuarioTab consultas={consultas} pacienteId={paciente.id} />
      ) : (
        <AvaliacoesTab avaliacoes={avaliacoes} authId={paciente.auth_id} />
      )}
    </div>
  );
}
