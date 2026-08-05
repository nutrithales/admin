"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { MoreHorizontal, Plus, Pencil, Trash2, Power, AppWindow, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { PageHeader } from "@/components/ui/PageHeader";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Dropdown, DropdownItem } from "@/components/ui/Dropdown";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/contexts/ToastContext";
import { deletePaginaAction, setPaginaAtivaAction } from "@/services/paginas.actions";
import type { PaginaPacienteComPaciente } from "@/services/paginas.queries";
import { PaginaFormModal } from "./PaginaFormModal";

export function PaginasClient({
  initialPaginas,
  pacientes,
}: {
  initialPaginas: PaginaPacienteComPaciente[];
  pacientes: { id: string; nome: string }[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [paginas, setPaginas] = useState(initialPaginas);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<PaginaPacienteComPaciente | null>(null);
  const [deleting, setDeleting] = useState<PaginaPacienteComPaciente | null>(null);

  useEffect(() => setPaginas(initialPaginas), [initialPaginas]);

  useEffect(() => {
    if (searchParams.get("new") === "1") {
      setEditing(null);
      setFormOpen(true);
      router.replace("/paginas-personalizadas");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function refresh() {
    router.refresh();
  }

  async function handleToggleAtiva(p: PaginaPacienteComPaciente) {
    const result = await setPaginaAtivaAction(p.id, !p.ativo);
    toast({ kind: result.success ? "success" : "error", title: result.message });
    refresh();
  }

  async function handleDelete() {
    if (!deleting) return;
    const result = await deletePaginaAction(deleting.id);
    toast({ kind: result.success ? "success" : "error", title: result.message });
    setDeleting(null);
    refresh();
  }

  const columns: Column<PaginaPacienteComPaciente>[] = [
    {
      key: "titulo",
      header: "Página",
      sortValue: (p) => p.titulo.toLowerCase(),
      render: (p) => (
        <div>
          <p className="font-semibold">{p.titulo}</p>
          <p className="text-xs text-muted">{p.tipo}</p>
        </div>
      ),
    },
    {
      key: "paciente",
      header: "Paciente",
      sortValue: (p) => p.paciente?.nome?.toLowerCase() ?? "",
      render: (p) => p.paciente?.nome ?? <span className="text-muted-light">—</span>,
    },
    {
      key: "url",
      header: "URL",
      render: (p) => (
        <a
          href={p.url_pagina}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1 text-brand-dark hover:underline"
        >
          <span className="max-w-[220px] truncate">{p.url_pagina}</span>
          <ExternalLink className="size-3.5 shrink-0" />
        </a>
      ),
    },
    {
      key: "ordem",
      header: "Ordem",
      sortValue: (p) => p.ordem,
      render: (p) => p.ordem,
    },
    {
      key: "ativo",
      header: "Status",
      sortValue: (p) => (p.ativo ? 1 : 0),
      render: (p) => (
        <Badge tone={p.ativo ? "success" : "muted"}>{p.ativo ? "Ativa" : "Inativa"}</Badge>
      ),
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
          <DropdownItem
            onClick={() => {
              setEditing(p);
              setFormOpen(true);
            }}
          >
            <Pencil className="size-4" /> Editar
          </DropdownItem>
          <DropdownItem onClick={() => handleToggleAtiva(p)}>
            <Power className="size-4" /> {p.ativo ? "Desativar" : "Ativar"}
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
        title="Páginas Personalizadas"
        description="Controle quais páginas (dashboards, diários, treinos...) cada paciente pode acessar."
        actions={
          <Button
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus className="size-4" /> Nova página
          </Button>
        }
      />

      {paginas.length === 0 ? (
        <EmptyState
          icon={AppWindow}
          title="Nenhuma página cadastrada"
          description="Crie a primeira página personalizada e vincule a um paciente."
          action={
            <Button onClick={() => setFormOpen(true)}>
              <Plus className="size-4" /> Nova página
            </Button>
          }
        />
      ) : (
        <DataTable
          data={paginas}
          columns={columns}
          rowKey={(p) => p.id}
          searchPlaceholder="Pesquisar por título, tipo ou paciente..."
          searchFields={(p) => `${p.titulo} ${p.tipo} ${p.paciente?.nome ?? ""}`}
        />
      )}

      <PaginaFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={refresh}
        pagina={editing}
        pacientes={pacientes}
      />

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        title="Excluir página"
        description={`Tem certeza que deseja excluir "${deleting?.titulo}"? Essa ação não pode ser desfeita.`}
        confirmLabel="Excluir"
      />
    </div>
  );
}
