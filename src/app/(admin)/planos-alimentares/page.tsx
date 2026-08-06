import { listPlanosAlimentares } from "@/services/planos.queries";
import { listPacientesForSelect } from "@/services/paginas.queries";
import { listPlanosEstruturados } from "@/services/planos-estruturados.queries";
import { listProtocolosParaSelecao } from "@/services/protocolos.queries";
import { PlanosClient } from "./PlanosClient";

export const metadata = { title: "Planos Alimentares" };

export default async function PlanosAlimentaresPage() {
  const [planos, pacientes, planosEstruturados, protocolos] = await Promise.all([
    listPlanosAlimentares(),
    listPacientesForSelect(),
    listPlanosEstruturados(),
    listProtocolosParaSelecao(),
  ]);

  return (
    <PlanosClient
      initialPlanos={planos}
      pacientes={pacientes}
      planosEstruturados={planosEstruturados}
      protocolos={protocolos}
    />
  );
}
