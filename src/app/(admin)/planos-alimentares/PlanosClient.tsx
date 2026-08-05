"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { MoreHorizontal, Plus, RefreshCw, Trash2, Eye, UtensilsCrossed } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { PageHeader } from "@/components/ui/PageHeader";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Dropdown, DropdownItem } from "@/components/ui/Dropdown";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/contexts/ToastContext";
import { deletePlanoAlimentarAction, getPlanoSignedUrlAction } from "@/services/planos.actions";
import type { PlanoAlimentarComPaciente } from "@/services/planos.queries";
import { PlanoUploadModal } from "./PlanoUploadModal";
import { ReplacePdfModal } from "./ReplacePdfModal";

export function PlanosClient({
  initialPlanos,
  pacientes,
}: {
  initialPlanos: PlanoAlimentarComPaciente[];
  pacientes: { id: string; nome: string }[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [planos, setPlanos] = useState(initialPlanos);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [replacing, setReplacing] = useState<PlanoAlimentarComPaciente | null>(null);
  const [deleting, setDeleting] = useState<PlanoAlimentarComPaciente | null>(null);

  useEffect(() => setPlanos(initialPlanos), [initialPlanos]);

  useEffect(() => {
    if (searchParams.get("new") === "1") {
      setUploadOpen(true);
      router.replace("/planos-alimentares");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function refresh() {
    router.refresh();
  }

  async function handleView(p: PlanoAlimentarComPaciente) {
    if (!p.path) {
      toast({ kind: "error", title: "Nenhum arquivo disponível para este plano." });
      return;
    }
    const result = await getPlanoSignedUrlAction(p.path);
    if (result.url) {
      window.open(result.url, "_blank", "noopener,noreferrer");
    } else {
      toast({ kind: "error", title: "Erro ao abrir arquivo", description: result.message });
    }
  }

  async function handleDelete() {
    if (!deleting) return;
    const result = await deletePlanoAlimentarAction(deleting.id);
    toast({ kind: result.success ? "success" : "error", title: result.message });
    setDeleting(null);
    refresh();
  }

  const columns: Column<PlanoAlimentarComPaciente>[] = [
    {
      key: "titulo",
      header: "Plano",
      sortValue: (p) => (p.titulo ?? "").toLowerCase(),
      render: (p) => <p className="font-semibold">{p.titulo || "Plano alimentar"}</p>,
    },
    {
      key: "paciente",
      header: "Paciente",
      sortValue: (p) => p.paciente?.nome?.toLowerCase() ?? "",
      render: (p) => p.paciente?.nome ?? <span className="text-muted-light">—</span>,
    },
    {
      key: "tipo",
      header: "Tipo",
      render: (p) => <Badge tone="muted">{p.tipo.toUpperCase()}</Badge>,
    },
    {
      key: "data_envio",
      header: "Enviado em",
      sortValue: (p) => p.data_envio ?? "",
      render: (p) => (p.data_envio ? new Date(p.data_envio).toLocaleDateString("pt-BR") : "—"),
    },
    {
      key: "actions",
      header: "",
      className: "text-right",
      render: (p) => (
        <Dropdown
          trigger={
            <button className="rounded-full p-1.5 text-muted hover:bg-bg-alt hover:text-ink">
              <MoreHorizontal className="size-4" />
            </button>
          }
        >
          <DropdownItem onClick={() => handleView(p)}>
            <Eye className="size-4" /> Ver PDF
          </DropdownItem>
          <DropdownItem onClick={() => setReplacing(p)}>
            <RefreshCw className="size-4" /> Trocar PDF
          </DropdownItem>
          <DropdownItem onClick={() => setDeleting(p)} className="text-danger hover:bg-red-50">
            <Trash2 className="size-4" /> Excluir
          </DropdownItem>
        </Dropdown>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Planos Alimentares"
        description="Envie e gerencie os planos alimentares em PDF de cada paciente."
        actions={
          <Button onClick={() => setUploadOpen(true)}>
            <Plus className="size-4" /> Novo plano
          </Button>
        }
      />

      {planos.length === 0 ? (
        <EmptyState
          icon={UtensilsCrossed}
          title="Nenhum plano alimentar enviado"
          description="Envie o primeiro plano em PDF para um paciente."
          action={
            <Button onClick={() => setUploadOpen(true)}>
              <Plus className="size-4" /> Novo plano
            </Button>
          }
        />
      ) : (
        <DataTable
          data={planos}
          columns={columns}
          rowKey={(p) => p.id}
          searchPlaceholder="Pesquisar por título ou paciente..."
          searchFields={(p) => `${p.titulo ?? ""} ${p.paciente?.nome ?? ""}`}
        />
      )}

      <PlanoUploadModal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onSaved={refresh}
        pacientes={pacientes}
      />

      <ReplacePdfModal plano={replacing} onClose={() => setReplacing(null)} onSaved={refresh} />

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        title="Excluir plano alimentar"
        description={`Tem certeza que deseja excluir "${deleting?.titulo}"? O arquivo será removido permanentemente.`}
        confirmLabel="Excluir"
      />
    </div>
  );
}
