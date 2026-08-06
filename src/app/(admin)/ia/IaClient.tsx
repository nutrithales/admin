"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { Card } from "@/components/ui/Card";
import { Tabs } from "@/components/ui/Tabs";
import type { HistoricoIaComPaciente } from "@/services/ia.queries";
import type { DocumentoBibliotecaComPaciente, PendentesRevisao } from "@/services/biblioteca-ia.queries";
import { BibliotecaDocumentosTab } from "./BibliotecaDocumentosTab";

export function IaClient({
  historico,
  documentos,
  pendentes,
  pacientes,
}: {
  historico: HistoricoIaComPaciente[];
  documentos: DocumentoBibliotecaComPaciente[];
  pendentes: PendentesRevisao;
  pacientes: { auth_id: string; nome: string }[];
}) {
  const [tab, setTab] = useState("biblioteca");

  return (
    <div>
      <PageHeader title="IA" description="Biblioteca de conhecimento por IA e histórico de interação dos pacientes com o assistente do app." />

      <Tabs
        className="mb-4"
        value={tab}
        onChange={setTab}
        items={[
          { key: "biblioteca", label: "Biblioteca de Documentos" },
          { key: "historico", label: "Histórico de pacientes" },
        ]}
      />

      {tab === "biblioteca" ? (
        <BibliotecaDocumentosTab documentos={documentos} pendentes={pendentes} pacientes={pacientes} />
      ) : historico.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          title="Nenhum histórico de IA ainda"
          description="Quando pacientes interagirem com o assistente de IA, as perguntas e respostas aparecerão aqui."
        />
      ) : (
        <div className="flex flex-col gap-4">
          {historico.map((item) => (
            <Card key={item.id} className="p-5">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-semibold text-ink">{item.paciente?.nome ?? "Paciente desconhecido"}</span>
                <span className="text-xs text-muted">{item.created_at && new Date(item.created_at).toLocaleString("pt-BR")}</span>
              </div>
              <p className="text-sm font-medium text-ink">{item.pergunta}</p>
              <p className="mt-1 text-sm text-muted">{item.resposta}</p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
