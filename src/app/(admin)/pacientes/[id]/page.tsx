import { notFound } from "next/navigation";
import { getPaciente } from "@/services/pacientes.queries";
import { listConsultasComProntuario } from "@/services/prontuarios.queries";
import { listAvaliacoesFisicas } from "@/services/avaliacoes.queries";
import { listPendenciasPorPaciente } from "@/services/pendencias.queries";
import { listPagamentosPorPaciente } from "@/services/pagamentos.queries";
import { listHistoricoFluxo } from "@/services/fluxo.queries";
import { PacienteDetailClient } from "./PacienteDetailClient";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { SuplementacaoAdmin } from "./SuplementacaoTab";

export const metadata = { title: "Paciente" };

export default async function PacienteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const paciente = await getPaciente(id);
  if (!paciente) notFound();

  const supabase = await createClient();
  const admin = createAdminClient() as any;

  const suplementacaoPromise = paciente.auth_id
    ? admin
        .from("suplementacao_paciente")
        .select("id,titulo,introducao,itens,observacoes,ativo")
        .eq("auth_id", paciente.auth_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()
    : Promise.resolve({ data: null });

  const [consultas, avaliacoes, { data: preConsulta }, pendencias, pagamentos, historicoFluxo, { data: suplementacao }] = await Promise.all([
    listConsultasComProntuario(paciente.auth_id),
    listAvaliacoesFisicas(paciente.auth_id),
    supabase.from("formularios_pre_consulta").select("*").eq("paciente_id", paciente.id).maybeSingle(),
    listPendenciasPorPaciente(paciente.id),
    listPagamentosPorPaciente(paciente.id),
    listHistoricoFluxo(paciente.id),
    suplementacaoPromise,
  ]);

  return (
    <PacienteDetailClient
      paciente={paciente}
      consultas={consultas}
      avaliacoes={avaliacoes}
      preConsulta={preConsulta}
      pendencias={pendencias}
      pagamentos={pagamentos}
      historicoFluxo={historicoFluxo}
      suplementacao={(suplementacao ?? null) as SuplementacaoAdmin | null}
    />
  );
}
