"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal, Plus, Pencil, Trash2, CalendarClock, CheckCircle2, CalendarX2, UserX } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { PageHeader } from "@/components/ui/PageHeader";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Dropdown, DropdownItem } from "@/components/ui/Dropdown";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/contexts/ToastContext";
import { deleteConsultaAction, updateConsultaStatusAction } from "@/services/consultas.actions";
import type { ConsultaComPaciente } from "@/services/consultas.queries";
import { CONSULTA_STATUS_LABEL, CONSULTA_STATUS_TONE, type ConsultaStatus } from "@/lib/clara/consultas";
import { ConsultaFormModal } from "./ConsultaFormModal";

export function ConsultasClient({
  initialConsultas,
  pacientes,
}: {
  initialConsultas: ConsultaComPaciente[];
  pacientes: { id: string; nome: string }[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [consultas, setConsultas] = useState(initialConsultas);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ConsultaComPaciente | null>(null);
  const [deleting, setDeleting] = useState<ConsultaComPaciente | null>(null);

  useEffect(() => setConsultas(initialConsultas), [initialConsultas]);

  function refresh() {
    router.refresh();
  }

  async function handleDelete() {
    if (!deleting) return;
    const result = await deleteConsultaAction(deleting.id);
    toast({ kind: result.success ? "success" : "error", title: result.message });
    setDeleting(null);
    refresh();
  }

  async function handleStatusChange(c: ConsultaComPaciente, status: ConsultaStatus) {
    const result = await updateConsultaStatusAction(c.id, status);
    toast({ kind: result.success ? "success" : "error", title: result.message });
    refresh();
  }

  const columns: Column<ConsultaComPaciente>[] = [
    {
      key: "paciente",
      header: "Paciente",
      sortValue: (c) => c.paciente?.nome?.toLowerCase() ?? "",
      render: (c) => <p className="font-semibold">{c.paciente?.nome ?? "—"}</p>,
    },
    {
      key: "data",
      header: "Data",
      sortValue: (c) => c.data ?? "",
      render: (c) =>
        c.data
          ? new Date(c.data).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })
          : "—",
    },
    {
      key: "tipo",
      header: "Tipo",
      render: (c) => <Badge tone="muted">{c.tipo === "presencial" ? "Presencial" : "On-line"}</Badge>,
    },
    {
      key: "status",
      header: "Status",
      sortValue: (c) => c.status,
      render: (c) => (
        <Badge tone={CONSULTA_STATUS_TONE[c.status as ConsultaStatus] ?? "muted"}>
          {CONSULTA_STATUS_LABEL[c.status as ConsultaStatus] ?? c.status ?? "—"}
        </Badge>
      ),
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
          <DropdownItem
            onClick={() => {
              setEditing(c);
              setFormOpen(true);
            }}
          >
            <Pencil className="size-4" /> Editar
          </DropdownItem>
          {c.status === "agendada" && (
            <DropdownItem onClick={() => handleStatusChange(c, "confirmada")}>
              <CheckCircle2 className="size-4" /> Confirmar
            </DropdownItem>
          )}
          {(c.status === "agendada" || c.status === "confirmada") && (
            <>
              <DropdownItem onClick={() => handleStatusChange(c, "realizada")}>
                <CheckCircle2 className="size-4" /> Concluir atendimento
              </DropdownItem>
              <DropdownItem onClick={() => handleStatusChange(c, "nao_compareceu")}>
                <UserX className="size-4" /> Não compareceu
              </DropdownItem>
              <DropdownItem onClick={() => handleStatusChange(c, "cancelada")}>
                <CalendarX2 className="size-4" /> Cancelar
              </DropdownItem>
            </>
          )}
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
        title="Consultas"
        description="Estrutura preparada para futura integração com o Google Calendar."
        actions={
          <Button
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus className="size-4" /> Nova consulta
          </Button>
        }
      />

      {consultas.length === 0 ? (
        <EmptyState
          icon={CalendarClock}
          title="Nenhuma consulta agendada"
          description="Agende a primeira consulta para um paciente."
          action={
            <Button onClick={() => setFormOpen(true)}>
              <Plus className="size-4" /> Nova consulta
            </Button>
          }
        />
      ) : (
        <DataTable
          data={consultas}
          columns={columns}
          rowKey={(c) => c.id}
          searchPlaceholder="Pesquisar por paciente..."
          searchFields={(c) => c.paciente?.nome ?? ""}
        />
      )}

      <ConsultaFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={refresh}
        consulta={editing}
        pacientes={pacientes}
      />

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        title="Excluir consulta"
        description="Tem certeza que deseja excluir esta consulta?"
        confirmLabel="Excluir"
      />
    </div>
  );
}
