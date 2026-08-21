import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DiaryDashboardClient from "./DiaryDashboardClient";

export const metadata = { title: "Diário alimentar | Nutri Thales Rosa" };

export default async function PacienteDiarioPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/paciente/login");

  const sb = supabase as any;
  const { data: paciente } = await sb
    .from("pacientes")
    .select("id,nome,diario_liberado")
    .eq("auth_id", user.id)
    .maybeSingle();

  if (!paciente) redirect("/paciente/login?error=not-patient");
  if (!paciente.diario_liberado) redirect("/paciente");

  const [{ data: config }, { data: registros }] = await Promise.all([
    sb.from("diario_configuracoes").select("id,titulo,targets,meal_data,ativo").eq("paciente_id", paciente.id).eq("ativo", true).maybeSingle(),
    sb.from("diario_registros").select("data,dados").eq("paciente_id", paciente.id).order("data", { ascending: false }).limit(70),
  ]);

  if (!config) redirect("/paciente");

  return (
    <DiaryDashboardClient
      patientId={paciente.id}
      patientName={paciente.nome || "Paciente"}
      title={config.titulo || "Diário alimentar"}
      targets={config.targets || { kcal: 2000, p: 120, c: 220, f: 65 }}
      mealData={config.meal_data || {}}
      initialRecords={registros || []}
    />
  );
}
