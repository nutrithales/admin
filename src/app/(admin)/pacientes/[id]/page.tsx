import { notFound } from "next/navigation";
import { getPaciente } from "@/services/pacientes.queries";
import { listConsultasComProntuario } from "@/services/prontuarios.queries";
import { listAvaliacoesFisicas } from "@/services/avaliacoes.queries";
import { PacienteDetailClient } from "./PacienteDetailClient";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Paciente" };

export default async function PacienteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const paciente = await getPaciente(id);
  if (!paciente) notFound();

  const supabase = await createClient();
  const [consultas, avaliacoes, { data: preConsulta }] = await Promise.all([
    listConsultasComProntuario(paciente.auth_id),
    listAvaliacoesFisicas(paciente.auth_id),
    supabase.from("formularios_pre_consulta").select("*").eq("paciente_id", paciente.id).maybeSingle(),
  ]);

  return <PacienteDetailClient paciente={paciente} consultas={consultas} avaliacoes={avaliacoes} preConsulta={preConsulta} />;
}
