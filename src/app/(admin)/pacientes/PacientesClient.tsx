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
  Mail,
  Wallet,
  Trash2,
  Users,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { PageHeader } from "@/components/ui/PageHeader";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Dropdown, DropdownItem } from "@/components/ui/Dropdown";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/contexts/ToastContext";
import type { PacienteComConsultas } from "@/services/pacientes.queries";
import {
  deletePacienteAction,
  resetPacientePasswordAction,
  sendBulkCredentialsAction,
  setPacienteStatusAction,
} from "@/services/pacientes.actions";
import { PacienteFormModal } from "./PacienteFormModal";
import { PlanoQuickEditModal } from "./PlanoQuickEditModal";
import { PasswordRevealModal } from "@/components/ui/PasswordRevealModal";
import { planEndDate } from "@/lib/agenda/plans";

type Paciente = PacienteComConsultas;

export function PacientesClient({ initialPacientes }: { initialPacientes: Paciente[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [pacientes, setPacientes] = useState(initialPacientes);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Paciente | null>(null);
  const [planoEditing, setPlanoEditing] = useState<Paciente | null>(null);
  const [planoAdding, setPlanoAdding] = useState(false);
  const [deleting, setDeleting] = useState<Paciente | null>(null);
  const [resetPassword, setResetPassword] = useState<{ nome: string; password: string } | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sendingBulk, setSendingBulk] = useState(false);

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

  async function handleBulkSendCredentials() {
    if (selected.size === 0) return;
    setSendingBulk(true);
    const result = await sendBulkCredentialsAction(Array.from(selected));
    setSendingBulk(false);
    toast({
      kind: result.success ? "success" : result.sent > 0 ? "warning" : "error",
      title: result.success ? "Credenciais enviadas" : "Envio concluído com falhas",
      description: result.message,
    });
    if (result.sent > 0) {
      setSelected(new Set());
      refresh();
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
        <button
          type="button"
          onClick={() => router.push(`/pacientes/${p.id}`)}
          className="group block w-full text-left"
          aria-label={`Abrir ficha de ${p.nome ?? "paciente"}`}
        >
          <p className="font-semibold text-ink group-hover:text-brand-dark group-hover:underline">{p.nome}</p>
          <p className="text-xs text-muted">{p.email}</p>
          <p className="mt-0.5 text-[11px] font-semibold text-brand-dark opacity-0 transition-opacity group-hover:opacity-100">Abrir ficha completa</p>
        </button>
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
        <Badge tone={p.status === "ativo" ? "success" : p.status === "pendente" ? "warning" : "muted"}>
          {p.status === "ativo" ? "Ativo" : p.status === "pendente" ? "Pendente" : "Inativo"}
        </Badge>
      ),
    },
    {
      key: "vigencia",
      header: "Vigência",
      sortValue: (p) => p.data_inicio ?? "",
      render: (p) => {
        const fim = planEndDate(p.data_inicio, p.plano);
        if (!p.data_inicio) return <span className="text-muted-light">—</span>;
        return (
          <div>
            <p className="font-medium">{new Date(`${p.data_inicio}T12:00:00Z`).toLocaleDateString("pt-BR", { timeZone: "UTC" })}</p>
            <p className="text-xs text-muted">até {fim ? fim.toLocaleDateString("pt-BR", { timeZone: "UTC" }) : "sem término"}</p>
          </div>
        );
      },
    },
    {
      key: "consultas",
      header: "Consultas",
      sortValue: (p) => p.consultas_realizadas,
      render: (p) => (
        <div>
          <p className="font-semibold">{p.consultas_realizadas} de {p.consultas_incluidas} realizadas</p>
          <p className="text-xs text-muted">{p.consultas_agendadas} agendada(s)</p>
        </div>
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
      render: (p) => p.last_login_at ? new Date(p.last_login_at).toLocaleDateString("pt-BR") : <span className="text-muted-light">Nunca</span>,
    },
    {
      key: "actions",
      header: "",
      className: "text-right",
      render: (p) => (
        <Dropdown trigger={<button className="rounded-full p-1.5 text-muted hover:bg-bg-alt hover:text-ink"><MoreHorizontal className="size-4" /></button>}>
          <DropdownItem onClick={() => router.push(`/pacientes/${p.id}`)}><FileText className="size-4" /> Ficha completa</DropdownItem>
          <DropdownItem onClick={() => { setEditing(p); setFormOpen(true); }}><Pencil className="size-4" /> Editar</DropdownItem>
          <DropdownItem onClick={() => setPlanoEditing(p)}><Wallet className="size-4" /> Alterar plano</DropdownItem>
          <DropdownItem onClick={() => handleResetPassword(p)}><KeyRound className="size-4" /> Resetar senha</DropdownItem>
          <DropdownItem onClick={() => handleToggleStatus(p)}>
            {p.status === "ativo" ? <><Ban className="size-4" /> Desativar acesso</> : p.status === "pendente" ? <><CheckCircle2 className="size-4" /> Aprovar cadastro</> : <><CheckCircle2 className="size-4" /> Ativar acesso</>}
          </DropdownItem>
          <DropdownItem onClick={() => setDeleting(p)} className="text-danger hover:bg-red-50"><Trash2 className="size-4" /> Excluir</DropdownItem>
        </Dropdown>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Pacientes"
        description="Gerencie o cadastro e o acesso dos seus pacientes. Clique no nome para abrir a ficha completa."
        actions={<div className="flex flex-wrap gap-2"><Button variant="secondary" onClick={() => setPlanoAdding(true)}><Wallet className="size-4" /> Adicionar plano</Button><Button onClick={() => { setEditing(null); setFormOpen(true); }}><Plus className="size-4" /> Novo paciente</Button></div>}
      />

      {pacientes.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Nenhum paciente cadastrado"
          description="Cadastre o primeiro paciente para liberar o acesso à plataforma."
          action={<Button onClick={() => setFormOpen(true)}><Plus className="size-4" /> Novo paciente</Button>}
        />
      ) : (
        <DataTable
          data={pacientes}
          columns={columns}
          rowKey={(p) => p.id}
          searchPlaceholder="Pesquisar por nome, e-mail ou CPF..."
          searchFields={(p) => `${p.nome ?? ""} ${p.email ?? ""} ${p.cpf ?? ""}`}
          selectedKeys={selected}
          onSelectedKeysChange={setSelected}
          toolbarRight={selected.size > 0 ? <Button variant="secondary" onClick={handleBulkSendCredentials} loading={sendingBulk}><Mail className="size-4" />{`Enviar credenciais (${selected.size})`}</Button> : undefined}
        />
      )}

      <PacienteFormModal open={formOpen} onClose={() => setFormOpen(false)} onSaved={refresh} paciente={editing} />
      <PlanoQuickEditModal paciente={planoEditing} onClose={() => setPlanoEditing(null)} onSaved={refresh} />
      <PlanoQuickEditModal open={planoAdding} paciente={null} pacientes={pacientes} onClose={() => setPlanoAdding(false)} onSaved={refresh} />
      <PasswordRevealModal open={!!resetPassword} password={resetPassword?.password ?? null} pacienteNome={resetPassword?.nome} onClose={() => setResetPassword(null)} />
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
