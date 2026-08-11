import { listPacientesPorEtapa } from "@/services/fluxo.queries";
import { FluxoClient } from "./FluxoClient";

export const metadata = { title: "Fluxo" };

export default async function FluxoPage() {
  const porEtapa = await listPacientesPorEtapa();
  return <FluxoClient porEtapa={porEtapa} />;
}
