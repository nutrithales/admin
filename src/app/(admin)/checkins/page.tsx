import Link from "next/link";
import { ClipboardCheck, ExternalLink } from "lucide-react";
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
      header: "Data",
      sortValue: (c) => c.semana ?? "",
      render: (c) => (c.semana ? new Date(`${c.semana}T12:00:00`).toLocaleDateString("pt-BR") : "—"),
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
      header: "Score",
      sortValue: (c) => c.pontuacao ?? 0,
      render: (c) => c.pontuacao != null ? `${c.pontuacao}%` : <span className="text-muted-light">—</span>,
    },
    {
      key: "origem",
      header: "Origem",
      render: (c) => <Badge tone={c.origem === "whatsapp" ? "brand" : "muted"}>{c.origem === "whatsapp" ? "WhatsApp" : c.origem}</Badge>,
    },
    {
      key: "revisado",
      header: "Revisão",
      render: (c) => <Badge tone={c.revisado ? "success" : "warning"}>{c.revisado ? "Revisado" : "Pendente"}</Badge>,
    },
    {
      key: "acoes",
      header: "Ações",
      render: (c) => (
        <Link href={`/checkins/${c.id}`} className="inline-flex items-center gap-1.5 rounded-xl bg-ink px-3 py-2 text-xs font-semibold text-white hover:opacity-90">
          Revisar <ExternalLink size={13} />
        </Link>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Check-ins"
        description="Central de acompanhamento: revise respostas, gere orientações, acompanhe a evolução e abra o WhatsApp do paciente."
      />

      {checkins.length === 0 ? (
        <EmptyState
          icon={ClipboardCheck}
          title="Nenhum check-in registrado"
          description="Envie o Check-in Quinzenal pela aba Formulários. Assim que o paciente responder, o resultado aparecerá aqui automaticamente."
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
