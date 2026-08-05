import { ClipboardCheck } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { listCheckins, type CheckinComPaciente } from "@/services/checkins.queries";

export const metadata = { title: "Check-ins" };

export default async function CheckinsPage() {
  const checkins = await listCheckins();

  const columns: Column<CheckinComPaciente>[] = [
    {
      key: "paciente",
      header: "Paciente",
      sortValue: (c) => c.paciente?.nome?.toLowerCase() ?? "",
      render: (c) => <p className="font-semibold">{c.paciente?.nome ?? "—"}</p>,
    },
    {
      key: "semana",
      header: "Semana",
      sortValue: (c) => c.semana ?? "",
      render: (c) => (c.semana ? new Date(c.semana).toLocaleDateString("pt-BR") : "—"),
    },
    {
      key: "resumo",
      header: "Resumo",
      render: (c) => (
        <span className="line-clamp-2 max-w-sm text-sm text-muted">
          {c.resumo || <span className="text-muted-light">—</span>}
        </span>
      ),
    },
    {
      key: "pontuacao",
      header: "Pontuação",
      sortValue: (c) => c.pontuacao ?? 0,
      render: (c) => c.pontuacao ?? <span className="text-muted-light">—</span>,
    },
    {
      key: "origem",
      header: "Origem",
      render: (c) => <Badge tone={c.origem === "liveclin" ? "brand" : "muted"}>{c.origem}</Badge>,
    },
  ];

  return (
    <div>
      <PageHeader
        title="Check-ins"
        description="Estrutura preparada para futura integração com o LiveClin. A integração ainda não está ativa."
      />

      {checkins.length === 0 ? (
        <EmptyState
          icon={ClipboardCheck}
          title="Nenhum check-in registrado"
          description="Quando a integração com o LiveClin for ativada, os check-ins dos pacientes aparecerão aqui automaticamente."
        />
      ) : (
        <DataTable
          data={checkins}
          columns={columns}
          rowKey={(c) => String(c.id)}
          searchPlaceholder="Pesquisar por paciente..."
          searchFields={(c) => c.paciente?.nome ?? ""}
        />
      )}
    </div>
  );
}
