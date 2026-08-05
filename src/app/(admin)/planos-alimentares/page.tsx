import { listPlanosAlimentares } from "@/services/planos.queries";
import { listPacientesForSelect } from "@/services/paginas.queries";
import { PlanosClient } from "./PlanosClient";

export const metadata = { title: "Planos Alimentares" };

export default async function PlanosAlimentaresPage() {
  const [planos, pacientes] = await Promise.all([
    listPlanosAlimentares(),
    listPacientesForSelect(),
  ]);

  return <PlanosClient initialPlanos={planos} pacientes={pacientes} />;
}
