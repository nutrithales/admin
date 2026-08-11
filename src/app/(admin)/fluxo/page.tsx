import { listFluxoPacientes } from "@/services/fluxo.queries";
import { FluxoClient } from "./FluxoClient";

export const metadata = { title: "Fluxo de pacientes" };

export default async function FluxoPage() {
  const patients = await listFluxoPacientes();
  return <FluxoClient initialPatients={patients} />;
}
