import { listRefeicoesModelo } from "@/services/refeicoes.queries";
import { RefeicoesClient } from "./RefeicoesClient";

export const metadata = { title: "Refeições" };

export default async function RefeicoesPage() {
  const refeicoes = await listRefeicoesModelo();
  return <RefeicoesClient initialRefeicoes={refeicoes} />;
}
