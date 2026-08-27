import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import WorkoutDashboardClient from "./WorkoutDashboardClient";
import WeeklyGoalEditor from "./WeeklyGoalEditor";

export const metadata = { title: "Dashboard de Treinos | Nutri Thales Rosa" };

function normalizeName(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
}

const ADAPTIVE_LOAD_PATIENTS = new Set(["leandro borges", "pedro muniz", "thales rosa"]);
type TrainingPatient = { id: string; nome: string | null; treino_liberado: boolean };

export default async function PacienteTreinosPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/paciente/login");

  const { data: pacienteData } = await supabase
    .from("pacientes")
    .select("id,nome,treino_liberado")
    .eq("auth_id", user.id)
    .maybeSingle();
  const paciente = pacienteData as unknown as TrainingPatient | null;

  if (!paciente) redirect("/paciente/login?error=not-patient");
  if (!paciente.treino_liberado) redirect("/paciente");

  const patientName = paciente.nome || "Paciente";
  const adaptiveLoadEnabled = ADAPTIVE_LOAD_PATIENTS.has(normalizeName(patientName));
  return (
    <>
      <WeeklyGoalEditor patientId={paciente.id} />
      <WorkoutDashboardClient patientId={paciente.id} patientName={patientName} adaptiveLoadEnabled={adaptiveLoadEnabled} />
    </>
  );
}
