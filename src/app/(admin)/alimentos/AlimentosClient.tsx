"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal, Plus, Pencil, Trash2, Apple } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { PageHeader } from "@/components/ui/PageHeader";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Dropdown, DropdownItem } from "@/components/ui/Dropdown";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/contexts/ToastContext";
import { deleteAlimentoAction } from "@/services/alimentos.actions";
import { origemPrioridade } from "@/utils/validation/alimento";
import type { Tables } from "@/types/database.types";
import { AlimentoFormModal } from "./AlimentoFormModal";

const origemLabel: Record<string, string> = {
  tbca_7_3: "TBCA 7.3",
  fabricante: "Fabricante",
  tucunduva: "Tucunduva",
  usda: "USDA",
  fao: "FAO",
  web: "Web",
  manual: "Manual",
};

const origemTone: Record<string, "brand" | "muted" | "info" | "warning"> = {
  tbca_7_3: "brand",
  fabricante: "info",
  tucunduva: "brand",
  usda: "muted",
  fao: "muted",
  web: "warning",
  manual: "muted",
};

export function AlimentosClient({ initialAlimentos }: { initialAlimentos: Tables<"alimentos">[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [alimentos, setAlimentos] = useState(initialAlimentos);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Tables<"alimentos"> | null>(null);
  const [deleting, setDeleting] = useState<Tables<"alimentos"> | null>(null);

  useEffect(() => setAlimentos(initialAlimentos), [initialAlimentos]);

  function refresh() {
    router.refresh();
  }

  async function handleDelete() {
    if (!deleting) return;
    const result = await deleteAlimentoAction(deleting.id);
    toast({ kind: result.success ? "success" : "error", title: result.message });
    setDeleting(null);
    refresh();
  }

  const sorted = [...alimentos].sort((a, b) => origemPrioridade(a.origem) - origemPrioridade(b.origem) || a.nome.localeCompare(b.nome));

  const columns: Column<Tables<"alimentos">>[] = [
    {
      key: "nome",
      header: "Alimento",
      sortValue: (a) => a.nome.toLowerCase(),
      render: (a) => (
        <div>
          <div className="flex items-center gap-1.5">
            <p className="font-semibold">{a.nome}</p>
            {!a.revisado_manualmente && <Badge tone="warning">Não revisado</Badge>}
          </div>
          {a.categoria && <p className="text-xs text-muted-light">{a.categoria}</p>}
        </div>
      ),
    },
    {
      key: "origem",
      header: "Fonte",
      sortValue: (a) => origemPrioridade(a.origem),
      render: (a) => <Badge tone={origemTone[a.origem] ?? "muted"}>{origemLabel[a.origem] ?? a.origem}</Badge>,
    },
    {
      key: "macros",
      header: "Kcal / P / C / G (100g)",
      render: (a) => (
        <span className="text-sm text-muted">
          {a.kcal_100g} kcal · {a.proteina_100g}g · {a.carboidrato_100g}g · {a.gordura_100g}g
        </span>
      ),
    },
    {
      key: "ativo",
      header: "Status",
      render: (a) => <Badge tone={a.ativo ? "success" : "muted"}>{a.ativo ? "Ativo" : "Inativo"}</Badge>,
    },
    {
      key: "actions",
      header: "",
      className: "text-right",
      render: (a) => (
        <Dropdown
          trigger={
            <button className="rounded-full p-1.5 text-muted hover:bg-bg-alt hover:text-ink">
              <MoreHorizontal className="size-4" />
            </button>
          }
        >
          <DropdownItem
            onClick={() => {
              setEditing(a);
              setFormOpen(true);
            }}
          >
            <Pencil className="size-4" /> Editar
          </DropdownItem>
          <DropdownItem onClick={() => setDeleting(a)} className="text-danger hover:bg-red-50">
            <Trash2 className="size-4" /> Excluir
          </DropdownItem>
        </Dropdown>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Alimentos"
        description="Base de alimentos multi-fonte (TBCA 7.3, fabricante, Tucunduva, USDA, FAO) usada pelas receitas."
        actions={
          <Button
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus className="size-4" /> Novo alimento
          </Button>
        }
      />

      {alimentos.length === 0 ? (
        <EmptyState
          icon={Apple}
          title="Nenhum alimento cadastrado"
          description="Cadastre o primeiro alimento ou importe uma base pronta."
          action={
            <Button onClick={() => setFormOpen(true)}>
              <Plus className="size-4" /> Novo alimento
            </Button>
          }
        />
      ) : (
        <DataTable
          data={sorted}
          columns={columns}
          rowKey={(a) => a.id}
          searchPlaceholder="Pesquisar por nome..."
          searchFields={(a) => `${a.nome} ${a.categoria ?? ""}`}
          pageSize={20}
        />
      )}

      <AlimentoFormModal open={formOpen} onClose={() => setFormOpen(false)} onSaved={refresh} alimento={editing} />

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        title="Excluir alimento"
        description={`Tem certeza que deseja excluir "${deleting?.nome}"?`}
        confirmLabel="Excluir"
      />
    </div>
  );
}
