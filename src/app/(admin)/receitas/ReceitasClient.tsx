"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal, Plus, Pencil, Trash2, ChefHat } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { PageHeader } from "@/components/ui/PageHeader";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Dropdown, DropdownItem } from "@/components/ui/Dropdown";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/contexts/ToastContext";
import { deleteReceitaAction } from "@/services/receitas.actions";
import type { ReceitaComItens } from "@/services/receitas.queries";
import { calcularMacrosTotais, arredondarMacros } from "@/lib/nutrition/calcular-macros";
import { ReceitaFormModal } from "./ReceitaFormModal";

export function ReceitasClient({ initialReceitas }: { initialReceitas: ReceitaComItens[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [receitas, setReceitas] = useState(initialReceitas);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ReceitaComItens | null>(null);
  const [deleting, setDeleting] = useState<ReceitaComItens | null>(null);

  useEffect(() => setReceitas(initialReceitas), [initialReceitas]);

  function refresh() {
    router.refresh();
  }

  async function handleDelete() {
    if (!deleting) return;
    const result = await deleteReceitaAction(deleting.id);
    toast({ kind: result.success ? "success" : "error", title: result.message });
    setDeleting(null);
    refresh();
  }

  const columns: Column<ReceitaComItens>[] = [
    {
      key: "nome",
      header: "Receita",
      sortValue: (r) => r.nome.toLowerCase(),
      render: (r) => (
        <div>
          <p className="font-semibold">{r.nome}</p>
          {r.origem_receita_id && <p className="text-xs text-muted-light">Variante de outra receita</p>}
        </div>
      ),
    },
    {
      key: "tags",
      header: "Tags",
      render: (r) => (
        <div className="flex flex-wrap gap-1">
          {(r.tags ?? []).length === 0 ? (
            <span className="text-muted-light">—</span>
          ) : (
            r.tags.map((t) => (
              <Badge key={t} tone="muted">
                {t}
              </Badge>
            ))
          )}
        </div>
      ),
    },
    {
      key: "kcal",
      header: "Kcal (total)",
      sortValue: (r) =>
        calcularMacrosTotais(r.itens.map((it) => ({ quantidade_g: it.quantidade_base_g, alimento: it.alimento }))).kcal,
      render: (r) => {
        const totais = arredondarMacros(
          calcularMacrosTotais(r.itens.map((it) => ({ quantidade_g: it.quantidade_base_g, alimento: it.alimento }))),
        );
        return <span className="text-muted">{totais.kcal} kcal</span>;
      },
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
        title="Receitas"
        description="O coração do sistema — monte uma vez, os macros calculam sozinhos pra sempre."
        actions={
          <Button
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus className="size-4" /> Nova receita
          </Button>
        }
      />

      {receitas.length === 0 ? (
        <EmptyState
          icon={ChefHat}
          title="Nenhuma receita cadastrada"
          description="Monte a primeira receita a partir dos alimentos da biblioteca."
          action={
            <Button onClick={() => setFormOpen(true)}>
              <Plus className="size-4" /> Nova receita
            </Button>
          }
        />
      ) : (
        <DataTable
          data={receitas}
          columns={columns}
          rowKey={(r) => r.id}
          searchPlaceholder="Pesquisar por nome..."
          searchFields={(r) => `${r.nome} ${(r.tags ?? []).join(" ")}`}
        />
      )}

      <ReceitaFormModal open={formOpen} onClose={() => setFormOpen(false)} onSaved={refresh} receita={editing} />

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        title="Excluir receita"
        description={`Tem certeza que deseja excluir "${deleting?.nome}"?`}
        confirmLabel="Excluir"
      />
    </div>
  );
}
