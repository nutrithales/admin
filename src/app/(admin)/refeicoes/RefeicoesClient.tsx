"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal, Plus, Pencil, Trash2, Salad } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { PageHeader } from "@/components/ui/PageHeader";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Dropdown, DropdownItem } from "@/components/ui/Dropdown";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/contexts/ToastContext";
import { deleteRefeicaoModeloAction } from "@/services/refeicoes.actions";
import type { RefeicaoModeloComOpcoes } from "@/services/refeicoes.queries";
import { RefeicaoModeloFormModal } from "./RefeicaoModeloFormModal";

export function RefeicoesClient({ initialRefeicoes }: { initialRefeicoes: RefeicaoModeloComOpcoes[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [refeicoes, setRefeicoes] = useState(initialRefeicoes);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<RefeicaoModeloComOpcoes | null>(null);
  const [deleting, setDeleting] = useState<RefeicaoModeloComOpcoes | null>(null);

  useEffect(() => setRefeicoes(initialRefeicoes), [initialRefeicoes]);

  function refresh() {
    router.refresh();
  }

  async function handleDelete() {
    if (!deleting) return;
    const result = await deleteRefeicaoModeloAction(deleting.id);
    toast({ kind: result.success ? "success" : "error", title: result.message });
    setDeleting(null);
    refresh();
  }

  const columns: Column<RefeicaoModeloComOpcoes>[] = [
    {
      key: "nome",
      header: "Refeição",
      sortValue: (r) => r.nome.toLowerCase(),
      render: (r) => <p className="font-semibold">{r.nome}</p>,
    },
    {
      key: "opcoes",
      header: "Opções",
      render: (r) => (
        <div className="flex flex-wrap gap-1">
          {r.opcoes.map((o) => (
            <Badge key={o.id} tone="muted">
              {o.nome}
            </Badge>
          ))}
        </div>
      ),
    },
    {
      key: "tags",
      header: "Tags",
      render: (r) => (
        <div className="flex flex-wrap gap-1">
          {(r.tags ?? []).map((t) => (
            <Badge key={t} tone="brand">
              {t}
            </Badge>
          ))}
        </div>
      ),
    },
    {
      key: "ativo",
      header: "Status",
      render: (r) => <Badge tone={r.ativo ? "success" : "muted"}>{r.ativo ? "Ativa" : "Inativa"}</Badge>,
    },
    {
      key: "actions",
      header: "",
      className: "text-right",
      render: (r) => (
        <Dropdown
          trigger={
            <button className="rounded-full p-1.5 text-muted hover:bg-bg-alt hover:text-ink">
              <MoreHorizontal className="size-4" />
            </button>
          }
        >
          <DropdownItem
            onClick={() => {
              setEditing(r);
              setFormOpen(true);
            }}
          >
            <Pencil className="size-4" /> Editar
          </DropdownItem>
          <DropdownItem onClick={() => setDeleting(r)} className="text-danger hover:bg-red-50">
            <Trash2 className="size-4" /> Excluir
          </DropdownItem>
        </Dropdown>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Refeições"
        description="Modelos de refeição com opções alternativas (ex.: Café da manhã → Opção 1, 2, 3)."
        actions={
          <Button
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus className="size-4" /> Nova refeição
          </Button>
        }
      />

      {refeicoes.length === 0 ? (
        <EmptyState
          icon={Salad}
          title="Nenhuma refeição-modelo cadastrada"
          description="Monte a primeira refeição com suas opções alternativas."
          action={
            <Button onClick={() => setFormOpen(true)}>
              <Plus className="size-4" /> Nova refeição
            </Button>
          }
        />
      ) : (
        <DataTable
          data={refeicoes}
          columns={columns}
          rowKey={(r) => r.id}
          searchPlaceholder="Pesquisar por nome..."
          searchFields={(r) => `${r.nome} ${(r.tags ?? []).join(" ")}`}
        />
      )}

      <RefeicaoModeloFormModal open={formOpen} onClose={() => setFormOpen(false)} onSaved={refresh} refeicao={editing} />

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        title="Excluir refeição-modelo"
        description={`Tem certeza que deseja excluir "${deleting?.nome}"?`}
        confirmLabel="Excluir"
      />
    </div>
  );
}
