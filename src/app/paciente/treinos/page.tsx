import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import WorkoutDashboardClient from "./WorkoutDashboardClient";
import ViniciusWorkoutDashboardClient from "./ViniciusWorkoutDashboardClient";

export const metadata = { title: "Dashboard de Treinos | Nutri Thales Rosa" };

function normalizeName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

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
  const normalizedName = normalizeName(patientName);
  const isViniciusSales = normalizedName.includes("vinicius") && normalizedName.includes("sales");

  if (isViniciusSales) {
    return <ViniciusWorkoutDashboardClient patientId={paciente.id} patientName={patientName} />;
  }

  return <WorkoutDashboardClient patientId={paciente.id} patientName={patientName} />;
}
