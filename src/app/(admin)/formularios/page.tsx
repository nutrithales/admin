import { PageHeader } from "@/components/ui/PageHeader";
import { listPacientesResumo } from "@/services/pacientes.queries";
import { listEnviosFormularios, listFormularios } from "@/services/formularios.queries";
import { FormulariosClient } from "./FormulariosClient";

export const metadata = { title: "Formulários" };

export default async function FormulariosPage() {
  const [formularios, pacientes, envios] = await Promise.all([
    listFormularios(),
    listPacientesResumo(),
    listEnviosFormularios(),
  ]);

  return (
    <div>
      <PageHeader
        title="Formulários"
        description="Crie links individuais, envie pelo WhatsApp e acompanhe respostas de check-ins e outros questionários."
      />
      <FormulariosClient formularios={formularios} pacientes={pacientes} envios={envios} />
    </div>
  );
}
