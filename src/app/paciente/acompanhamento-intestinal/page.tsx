import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import IntestinalTracker from "./IntestinalTracker";

export const metadata = { title: "Acompanhamento intestinal | Nutri Thales Rosa" };

export default async function AcompanhamentoIntestinalPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/paciente/login");
  const sb = supabase as any;
  const { data: paciente } = await sb.from("pacientes")
    .select("id,nome").eq("auth_id", user.id).maybeSingle();
  if (!paciente) redirect("/paciente");
  // Recurso clínico liberado somente para Vinicius Sales.
  if (paciente.id !== "20c469e7-43c6-41c3-9f19-b5704ced772b") redirect("/paciente");
  const { data: registros } = await sb.from("acompanhamento_intestinal")
    .select("id,data,evacuacoes,bristol,urgencia,episodios_urgencia,dor,distensao,refeicao_associada,observacoes")
    .eq("paciente_id", paciente.id).order("data", { ascending: false }).limit(60);
  return <IntestinalTracker patientId={paciente.id} initialRecords={registros ?? []} />;
}
