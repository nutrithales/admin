"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal, Plus, Pencil, Trash2, ListChecks } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { PageHeader } from "@/components/ui/PageHeader";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Dropdown, DropdownItem } from "@/components/ui/Dropdown";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/contexts/ToastContext";
import { deleteProtocoloAction } from "@/services/protocolos.actions";
import type { ProtocoloComDetalhes } from "@/services/protocolos.queries";
import { ProtocoloFormModal } from "./ProtocoloFormModal";

export function ProtocolosClient({ initialProtocolos }: { initialProtocolos: ProtocoloComDetalhes[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [protocolos, setProtocolos] = useState(initialProtocolos);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ProtocoloComDetalhes | null>(null);
  const [deleting, setDeleting] = useState<ProtocoloComDetalhes | null>(null);

  useEffect(() => setProtocolos(initialProtocolos), [initialProtocolos]);

  function refresh() {
    router.refresh();
  }

  async function handleDelete() {
    if (!deleting) return;
    const result = await deleteProtocoloAction(deleting.id);
    toast({ kind: result.success ? "success" : "error", title: result.message });
    setDeleting(null);
    refresh();
  }

  const columns: Column<ProtocoloComDetalhes>[] = [
    {
      key: "nome",
      header: "Protocolo",
      sortValue: (p) => p.nome.toLowerCase(),
      render: (p) => (
        <div>
          <p className="font-semibold">{p.nome}</p>
          {p.descricao && <p className="text-xs text-muted-light">{p.descricao}</p>}
        </div>
      ),
    },
    {
      key: "refeicoes",
      header: "Horários",
      render: (p) => (
        <div className="flex flex-wrap gap-1">
          {p.refeicoes.map((r) => (
            <Badge key={r.id} tone="muted">
              {r.nome}
              {r.percentual_kcal ? ` · ${r.percentual_kcal}%` : ""}
            </Badge>
          ))}
        </div>
      ),
    },
    {
      key: "receitas",
      header: "Receitas preferidas",
      render: (p) => <span className="text-sm text-muted">{p.receitas_preferidas.length}</span>,
    },
    {
      key: "ativo",
      header: "Status",
      render: (p) => <Badge tone={p.ativo ? "success" : "muted"}>{p.ativo ? "Ativo" : "Inativo"}</Badge>,
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
        title="Protocolos"
        description="A metodologia Nutri Thales Rosa, estruturada: horários, refeições/receitas prioritárias e faixas de macro."
        actions={
          <Button
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus className="size-4" /> Novo protocolo
          </Button>
        }
      />

      {protocolos.length === 0 ? (
        <EmptyState
          icon={ListChecks}
          title="Nenhum protocolo cadastrado"
          description="Cadastre o primeiro protocolo com os horários e prioridades da sua metodologia."
          action={
            <Button onClick={() => setFormOpen(true)}>
              <Plus className="size-4" /> Novo protocolo
            </Button>
          }
        />
      ) : (
        <DataTable
          data={protocolos}
          columns={columns}
          rowKey={(p) => p.id}
          searchPlaceholder="Pesquisar por nome..."
          searchFields={(p) => `${p.nome} ${p.descricao ?? ""}`}
        />
      )}

      <ProtocoloFormModal open={formOpen} onClose={() => setFormOpen(false)} onSaved={refresh} protocolo={editing} />

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        title="Excluir protocolo"
        description={`Tem certeza que deseja excluir "${deleting?.nome}"?`}
        confirmLabel="Excluir"
      />
    </div>
  );
}
