import { listDadosMatrizNutricional } from "@/services/matriz-nutricional.queries";
import { MatrizNutricionalClient } from "./MatrizNutricionalClient";

export const metadata = { title: "Matriz Nutricional" };

export default async function MatrizNutricionalPage() {
  const dados = await listDadosMatrizNutricional();
  return <MatrizNutricionalClient pacientes={dados.pacientes} matrizes={dados.matrizes} />;
}
