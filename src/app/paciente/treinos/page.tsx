import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import WorkoutDashboardClient from "./WorkoutDashboardClient";

export const metadata = { title: "Dashboard de Treinos | Nutri Thales Rosa" };

export default async function PacienteTreinosPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/paciente/login");

  const { data: paciente } = await (supabase as any)
    .from("pacientes")
    .select("id,nome,treino_liberado")
    .eq("auth_id", user.id)
    .maybeSingle();

  if (!paciente) redirect("/paciente/login?error=not-patient");
  if (!paciente.treino_liberado) redirect("/paciente");

  const patientName = paciente.nome || "Paciente";
  return <WorkoutDashboardClient patientId={paciente.id} patientName={patientName} />;
}
