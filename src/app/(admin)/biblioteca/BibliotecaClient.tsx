"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { MoreHorizontal, Plus, Pencil, Power, Trash2, Eye, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { PageHeader } from "@/components/ui/PageHeader";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Dropdown, DropdownItem } from "@/components/ui/Dropdown";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/contexts/ToastContext";
import {
  deleteConteudoBibliotecaAction,
  getBibliotecaSignedUrlAction,
  setConteudoAtivoAction,
} from "@/services/biblioteca.actions";
import type { Tables } from "@/types/database.types";
import { ConteudoFormModal } from "./ConteudoFormModal";

type Conteudo = Tables<"biblioteca">;

export function BibliotecaClient({
  initialConteudos,
  categoriasSugeridas,
}: {
  initialConteudos: Conteudo[];
  categoriasSugeridas: string[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [conteudos, setConteudos] = useState(initialConteudos);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Conteudo | null>(null);
  const [deleting, setDeleting] = useState<Conteudo | null>(null);

  useEffect(() => setConteudos(initialConteudos), [initialConteudos]);

  useEffect(() => {
    if (searchParams.get("new") === "1") {
      setEditing(null);
      setFormOpen(true);
      router.replace("/biblioteca");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function refresh() {
    router.refresh();
  }

  async function handleView(c: Conteudo) {
    if (c.tipo === "link" && c.url) {
      window.open(c.url, "_blank", "noopener,noreferrer");
      return;
    }
    if (!c.path) {
      toast({ kind: "error", title: "Nenhum arquivo disponível." });
      return;
    }
    const result = await getBibliotecaSignedUrlAction(c.path);
    if (result.url) window.open(result.url, "_blank", "noopener,noreferrer");
    else toast({ kind: "error", title: "Erro ao abrir arquivo", description: result.message });
  }

  async function handleToggleAtivo(c: Conteudo) {
    const result = await setConteudoAtivoAction(c.id, !c.ativo);
    toast({ kind: result.success ? "success" : "error", title: result.message });
    refresh();
  }

  async function handleDelete() {
    if (!deleting) return;
    const result = await deleteConteudoBibliotecaAction(deleting.id);
    toast({ kind: result.success ? "success" : "error", title: result.message });
    setDeleting(null);
    refresh();
  }

  const columns: Column<Conteudo>[] = [
    {
      key: "titulo",
      header: "Conteúdo",
      sortValue: (c) => c.titulo.toLowerCase(),
      render: (c) => (
        <div>
          <p className="font-semibold">{c.titulo}</p>
          {c.descricao && <p className="max-w-xs truncate text-xs text-muted">{c.descricao}</p>}
        </div>
      ),
    },
    {
      key: "categoria",
      header: "Categoria",
      sortValue: (c) => c.categoria?.toLowerCase() ?? "",
      render: (c) => c.categoria ?? <span className="text-muted-light">—</span>,
    },
    {
      key: "tipo",
      header: "Tipo",
      render: (c) => <Badge tone="muted">{c.tipo.toUpperCase()}</Badge>,
    },
    {
      key: "ordem",
      header: "Ordem",
      sortValue: (c) => c.ordem ?? 0,
      render: (c) => c.ordem ?? 0,
    },
    {
      key: "ativo",
      header: "Status",
      sortValue: (c) => (c.ativo ? 1 : 0),
      render: (c) => <Badge tone={c.ativo ? "success" : "muted"}>{c.ativo ? "Ativo" : "Inativo"}</Badge>,
    },
    {
      key: "actions",
      header: "",
      className: "text-right",
      render: (c) => (
        <Dropdown
          trigger={
            <button className="rounded-full p-1.5 text-muted hover:bg-bg-alt hover:text-ink">
              <MoreHorizontal className="size-4" />
            </button>
          }
        >
          <DropdownItem onClick={() => handleView(c)}>
            <Eye className="size-4" /> Visualizar
          </DropdownItem>
          <DropdownItem
            onClick={() => {
              setEditing(c);
              setFormOpen(true);
            }}
          >
            <Pencil className="size-4" /> Editar
          </DropdownItem>
          <DropdownItem onClick={() => handleToggleAtivo(c)}>
            <Power className="size-4" /> {c.ativo ? "Desativar" : "Ativar"}
          </DropdownItem>
          <DropdownItem onClick={() => setDeleting(c)} className="text-danger hover:bg-red-50">
            <Trash2 className="size-4" /> Excluir
          </DropdownItem>
        </Dropdown>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Biblioteca"
        description="Conteúdos disponibilizados para os pacientes: PDFs, vídeos e links."
        actions={
          <Button
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus className="size-4" /> Novo conteúdo
          </Button>
        }
      />

      {conteudos.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="Nenhum conteúdo publicado"
          description="Adicione o primeiro conteúdo à biblioteca."
          action={
            <Button onClick={() => setFormOpen(true)}>
              <Plus className="size-4" /> Novo conteúdo
            </Button>
          }
        />
      ) : (
        <DataTable
          data={conteudos}
          columns={columns}
          rowKey={(c) => c.id}
          searchPlaceholder="Pesquisar por título ou categoria..."
          searchFields={(c) => `${c.titulo} ${c.categoria ?? ""}`}
        />
      )}

      <ConteudoFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={refresh}
        conteudo={editing}
        categoriasSugeridas={categoriasSugeridas}
      />

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        title="Excluir conteúdo"
        description={`Tem certeza que deseja excluir "${deleting?.titulo}"? Essa ação não pode ser desfeita.`}
        confirmLabel="Excluir"
      />
    </div>
  );
}
