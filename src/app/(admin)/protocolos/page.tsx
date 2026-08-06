import { listProtocolos } from "@/services/protocolos.queries";
import { ProtocolosClient } from "./ProtocolosClient";

export const metadata = { title: "Protocolos" };

export default async function ProtocolosPage() {
  const protocolos = await listProtocolos();
  return <ProtocolosClient initialProtocolos={protocolos} />;
}
