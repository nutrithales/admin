"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  MoreHorizontal,
  Plus,
  Pencil,
  Ban,
  CheckCircle2,
  KeyRound,
  Wallet,
  Trash2,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { PageHeader } from "@/components/ui/PageHeader";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Dropdown, DropdownItem } from "@/components/ui/Dropdown";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/contexts/ToastContext";
import type { Tables } from "@/types/database.types";
import {
  deletePacienteAction,
  resetPacientePasswordAction,
  setPacienteStatusAction,
} from "@/services/pacientes.actions";
import { PacienteFormModal } from "./PacienteFormModal";
import { PlanoQuickEditModal } from "./PlanoQuickEditModal";
import { PasswordRevealModal } from "@/components/ui/PasswordRevealModal";

type Paciente = Tables<"pacientes">;

export function PacientesClient({ initialPacientes }: { initialPacientes: Paciente[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [pacientes, setPacientes] = useState(initialPacientes);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Paciente | null>(null);
  const [planoEditing, setPlanoEditing] = useState<Paciente | null>(null);
  const [deleting, setDeleting] = useState<Paciente | null>(null);
  const [resetPassword, setResetPassword] = useState<{ nome: string; password: string } | null>(
    null,
  );

  useEffect(() => setPacientes(initialPacientes), [initialPacientes]);

  useEffect(() => {
    if (searchParams.get("new") === "1") {
      setEditing(null);
      setFormOpen(true);
      router.replace("/pacientes");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function refresh() {
    router.refresh();
  }

  async function handleToggleStatus(p: Paciente) {
    const novoStatus = p.status === "ativo" ? "inativo" : "ativo";
    const result = await setPacienteStatusAction(p.id, novoStatus);
    if (result.success) {
      toast({ kind: "success", title: result.message });
      refresh();
    } else {
      toast({ kind: "error", title: "Erro", description: result.message });
    }
  }

  async function handleResetPassword(p: Paciente) {
    const result = await resetPacientePasswordAction(p.id);
    if (result.success && result.password) {
      setResetPassword({ nome: p.nome ?? "paciente", password: result.password });
    } else {
      toast({ kind: "error", title: "Erro", description: result.message });
    }
  }

  async function handleDelete() {
    if (!deleting) return;
    const result = await deletePacienteAction(deleting.id);
    toast({
      kind: result.success ? "success" : "error",
      title: result.success ? "Paciente excluído" : "Erro",
      description: result.success ? undefined : result.message,
    });
    setDeleting(null);
    refresh();
  }

  const columns: Column<Paciente>[] = [
    {
      key: "nome",
      header: "Nome",
      sortValue: (p) => (p.nome ?? "").toLowerCase(),
      render: (p) => (
        <div>
          <p className="font-semibold">{p.nome}</p>
          <p className="text-xs text-muted">{p.email}</p>
        </div>
      ),
    },
    {
      key: "telefone",
      header: "Telefone",
      render: (p) => p.telefone || <span className="text-muted-light">—</span>,
    },
    {
      key: "cpf",
      header: "CPF",
      render: (p) => p.cpf || <span className="text-muted-light">—</span>,
    },
    {
      key: "plano",
      header: "Plano",
      sortValue: (p) => p.plano?.toLowerCase() ?? "",
      render: (p) => p.plano || <span className="text-muted-light">—</span>,
    },
    {
      key: "status",
      header: "Status",
      sortValue: (p) => p.status,
      render: (p) => (
        <Badge tone={p.status === "ativo" ? "success" : "muted"}>
          {p.status === "ativo" ? "Ativo" : "Inativo"}
        </Badge>
      ),
    },
    {
      key: "created_at",
      header: "Cadastro",
      sortValue: (p) => p.created_at ?? "",
      render: (p) => (p.created_at ? new Date(p.created_at).toLocaleDateString("pt-BR") : "—"),
    },
    {
      key: "last_login_at",
      header: "Último login",
      sortValue: (p) => p.last_login_at ?? "",
      render: (p) =>
        p.last_login_at ? (
          new Date(p.last_login_at).toLocaleDateString("pt-BR")
        ) : (
          <span className="text-muted-light">Nunca</span>
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
          <DropdownItem onClick={() => setPlanoEditing(p)}>
            <Wallet className="size-4" /> Alterar plano
          </DropdownItem>
          <DropdownItem onClick={() => handleResetPassword(p)}>
            <KeyRound className="size-4" /> Resetar senha
          </DropdownItem>
          <DropdownItem onClick={() => handleToggleStatus(p)}>
            {p.status === "ativo" ? (
              <>
                <Ban className="size-4" /> Desativar acesso
              </>
            ) : (
              <>
                <CheckCircle2 className="size-4" /> Ativar acesso
              </>
            )}
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
        title="Pacientes"
        description="Gerencie o cadastro e o acesso dos seus pacientes."
        actions={
          <Button
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus className="size-4" /> Novo paciente
          </Button>
        }
      />

      {pacientes.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Nenhum paciente cadastrado"
          description="Cadastre o primeiro paciente para liberar o acesso à plataforma."
          action={
            <Button onClick={() => setFormOpen(true)}>
              <Plus className="size-4" /> Novo paciente
            </Button>
          }
        />
      ) : (
        <DataTable
          data={pacientes}
          columns={columns}
          rowKey={(p) => p.id}
          searchPlaceholder="Pesquisar por nome, e-mail ou CPF..."
          searchFields={(p) => `${p.nome ?? ""} ${p.email ?? ""} ${p.cpf ?? ""}`}
        />
      )}

      <PacienteFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={refresh}
        paciente={editing}
      />

      <PlanoQuickEditModal
        paciente={planoEditing}
        onClose={() => setPlanoEditing(null)}
        onSaved={refresh}
      />

      <PasswordRevealModal
        open={!!resetPassword}
        password={resetPassword?.password ?? null}
        pacienteNome={resetPassword?.nome}
        onClose={() => setResetPassword(null)}
      />

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        title="Excluir paciente"
        description={`Tem certeza que deseja excluir ${deleting?.nome}? Essa ação também remove o acesso do paciente à plataforma e não pode ser desfeita.`}
        confirmLabel="Excluir"
      />
    </div>
  );
}
