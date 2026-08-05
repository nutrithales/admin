import { listPaginasPaciente, listPacientesForSelect } from "@/services/paginas.queries";
import { PaginasClient } from "./PaginasClient";

export const metadata = { title: "Páginas Personalizadas" };

export default async function PaginasPersonalizadasPage() {
  const [paginas, pacientes] = await Promise.all([
    listPaginasPaciente(),
    listPacientesForSelect(),
  ]);

  return <PaginasClient initialPaginas={paginas} pacientes={pacientes} />;
}
