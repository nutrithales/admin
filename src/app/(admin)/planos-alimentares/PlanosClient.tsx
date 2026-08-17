"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { MoreHorizontal, Plus, RefreshCw, Trash2, Eye, UtensilsCrossed, Wand2, ArrowRight } from "lucide-react";
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
import { deletePlanoEstruturadoAction } from "@/services/planos-estruturados.actions";
import type { PlanoEstruturadoResumo } from "@/services/planos-estruturados.queries";
import { PlanoUploadModal } from "./PlanoUploadModal";
import { ReplacePdfModal } from "./ReplacePdfModal";
import { NovoPlanoEstruturadoModal } from "./NovoPlanoEstruturadoModal";

const statusLabel: Record<string, string> = { rascunho: "Rascunho", finalizado: "Finalizado" };

export function PlanosClient({
  initialPlanos,
  pacientes,
  planosEstruturados,
  protocolos,
}: {
  initialPlanos: PlanoAlimentarComPaciente[];
  pacientes: { id: string; nome: string }[];
  planosEstruturados: PlanoEstruturadoResumo[];
  protocolos: { id: string; nome: string }[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [planos, setPlanos] = useState(initialPlanos);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [novoEstruturadoOpen, setNovoEstruturadoOpen] = useState(false);
  const [replacing, setReplacing] = useState<PlanoAlimentarComPaciente | null>(null);
  const [deleting, setDeleting] = useState<PlanoAlimentarComPaciente | null>(null);
  const [deletingEstruturado, setDeletingEstruturado] = useState<PlanoEstruturadoResumo | null>(null);

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

  async function handleDeleteEstruturado() {
    if (!deletingEstruturado) return;
    const result = await deletePlanoEstruturadoAction(deletingEstruturado.id);
    toast({ kind: result.success ? "success" : "error", title: result.message });
    setDeletingEstruturado(null);
    refresh();
  }

  const colunasEstruturados: Column<PlanoEstruturadoResumo>[] = [
    {
      key: "titulo",
      header: "Plano",
      sortValue: (p) => (p.titulo ?? "").toLowerCase(),
      render: (p) => <p className="font-semibold">{p.titulo || "Plano estruturado"}</p>,
    },
    {
      key: "paciente",
      header: "Paciente",
      sortValue: (p) => p.paciente_nome?.toLowerCase() ?? "",
      render: (p) => p.paciente_nome ?? <span className="text-muted-light">-</span>,
    },
    {
      key: "status",
      header: "Status",
      render: (p) => <Badge tone={p.status === "finalizado" ? "success" : "brand"}>{statusLabel[p.status] ?? p.status}</Badge>,
    },
    {
      key: "created_at",
      header: "Criado em",
      sortValue: (p) => p.created_at,
      render: (p) => new Date(p.created_at).toLocaleDateString("pt-BR"),
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
          <DropdownItem onClick={() => router.push(`/planos-alimentares/${p.id}/preview-paciente`)}>
            <Eye className="size-4" /> Ver como paciente
          </DropdownItem>
          <DropdownItem onClick={() => router.push(`/planos-alimentares/${p.id}`)}>
            <ArrowRight className="size-4" /> Abrir builder
          </DropdownItem>
          <DropdownItem onClick={() => setDeletingEstruturado(p)} className="text-danger hover:bg-red-50">
            <Trash2 className="size-4" /> Excluir
          </DropdownItem>
        </Dropdown>
      ),
    },
  ];

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
      render: (p) => p.paciente?.nome ?? <span className="text-muted-light">-</span>,
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
      render: (p) => (p.data_envio ? new Date(p.data_envio).toLocaleDateString("pt-BR") : "-"),
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
        description="Monte planos estruturados com cálculo automático de macros ou envie um PDF pronto."
        actions={
          <>
            <Button variant="outline" onClick={() => setUploadOpen(true)}>
              <Plus className="size-4" /> Novo plano em PDF
            </Button>
            <Button onClick={() => setNovoEstruturadoOpen(true)}>
              <Wand2 className="size-4" /> Montar plano estruturado
            </Button>
          </>
        }
      />

      <div className="mb-8">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted">Planos estruturados</h2>
        {planosEstruturados.length === 0 ? (
          <EmptyState
            icon={Wand2}
            title="Nenhum plano estruturado ainda"
            description="Monte o primeiro plano escolhendo um paciente e um protocolo - as quantidades são calculadas automaticamente."
            action={
              <Button onClick={() => setNovoEstruturadoOpen(true)}>
                <Wand2 className="size-4" /> Montar plano estruturado
              </Button>
            }
          />
        ) : (
          <DataTable
            data={planosEstruturados}
            columns={colunasEstruturados}
            rowKey={(p) => p.id}
            searchPlaceholder="Pesquisar por título ou paciente..."
            searchFields={(p) => `${p.titulo ?? ""} ${p.paciente_nome ?? ""}`}
          />
        )}
      </div>

      <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted">Planos em PDF</h2>
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

      <NovoPlanoEstruturadoModal
        open={novoEstruturadoOpen}
        onClose={() => setNovoEstruturadoOpen(false)}
        pacientes={pacientes}
        protocolos={protocolos}
      />

      <ConfirmDialog
        open={!!deletingEstruturado}
        onClose={() => setDeletingEstruturado(null)}
        onConfirm={handleDeleteEstruturado}
        title="Excluir plano estruturado"
        description={`Tem certeza que deseja excluir "${deletingEstruturado?.titulo ?? "este plano"}"?`}
        confirmLabel="Excluir"
      />
    </div>
  );
}
