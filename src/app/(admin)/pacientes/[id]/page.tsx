import { notFound } from "next/navigation";
import { getPaciente } from "@/services/pacientes.queries";
import { listConsultasComProntuario } from "@/services/prontuarios.queries";
import { listAvaliacoesFisicas } from "@/services/avaliacoes.queries";
import { listPendenciasPorPaciente } from "@/services/pendencias.queries";
import { listPagamentosPorPaciente } from "@/services/pagamentos.queries";
import { listHistoricoFluxo } from "@/services/fluxo.queries";
import { PacienteDetailClient } from "./PacienteDetailClient";

export const metadata = { title: "Paciente" };

export default async function PacienteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const paciente = await getPaciente(id);
  if (!paciente) notFound();

  const [consultas, avaliacoes, pendencias, pagamentos, historicoFluxo] = await Promise.all([
    listConsultasComProntuario(paciente.auth_id),
    listAvaliacoesFisicas(paciente.auth_id),
    listPendenciasPorPaciente(paciente.id),
    listPagamentosPorPaciente(paciente.id),
    listHistoricoFluxo(paciente.id),
  ]);

  return (
    <PacienteDetailClient
      paciente={paciente}
      consultas={consultas}
      avaliacoes={avaliacoes}
      pendencias={pendencias}
      pagamentos={pagamentos}
      historicoFluxo={historicoFluxo}
    />
  );
}
