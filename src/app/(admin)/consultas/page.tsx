import { listConsultas } from "@/services/consultas.queries";
import { listPacientesForSelect } from "@/services/paginas.queries";
import { ConsultasClient } from "./ConsultasClient";

export const metadata = { title: "Consultas" };

export default async function ConsultasPage() {
  const [consultas, pacientes] = await Promise.all([listConsultas(), listPacientesForSelect()]);
  return <ConsultasClient initialConsultas={consultas} pacientes={pacientes} />;
}
