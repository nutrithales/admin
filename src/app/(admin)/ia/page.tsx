import { listHistoricoIa } from "@/services/ia.queries";
import { listDocumentosBiblioteca, listPendentesRevisao } from "@/services/biblioteca-ia.queries";
import { listPacientes } from "@/services/pacientes.queries";
import { IaClient } from "./IaClient";

export const metadata = { title: "IA" };

export default async function IaPage() {
  const [historico, documentos, pendentes, pacientes] = await Promise.all([
    listHistoricoIa(),
    listDocumentosBiblioteca(),
    listPendentesRevisao(),
    listPacientes(),
  ]);

  return (
    <IaClient
      historico={historico}
      documentos={documentos}
      pendentes={pendentes}
      pacientes={pacientes.map((p) => ({ auth_id: p.auth_id, nome: p.nome ?? "Sem nome" }))}
    />
  );
}
