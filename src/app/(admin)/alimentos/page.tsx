import { listAlimentos } from "@/services/alimentos.queries";
import { AlimentosClient } from "./AlimentosClient";

export const metadata = { title: "Alimentos" };

export default async function AlimentosPage() {
  const alimentos = await listAlimentos();
  return <AlimentosClient initialAlimentos={alimentos} />;
}
