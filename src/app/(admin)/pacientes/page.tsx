import { listPacientes } from "@/services/pacientes.queries";
import { PacientesClient } from "./PacientesClient";

export const metadata = { title: "Pacientes" };

export default async function PacientesPage() {
  const pacientes = await listPacientes();
  return <PacientesClient initialPacientes={pacientes} />;
}
