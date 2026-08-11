import { listPacientesPorEstagio } from "@/services/fluxo.queries";
import { FluxoClient } from "./FluxoClient";

export const metadata = { title: "Fluxo" };

export default async function FluxoPage() {
  const porEstagio = await listPacientesPorEstagio();
  return <FluxoClient porEstagio={porEstagio} />;
}
