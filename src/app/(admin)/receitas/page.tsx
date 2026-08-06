import { listReceitas } from "@/services/receitas.queries";
import { ReceitasClient } from "./ReceitasClient";

export const metadata = { title: "Receitas" };

export default async function ReceitasPage() {
  const receitas = await listReceitas();
  return <ReceitasClient initialReceitas={receitas} />;
}
