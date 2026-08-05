"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Label, FieldGroup, Textarea, Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { consultaSchema, type ConsultaFormValues } from "@/utils/validation/consulta";
import { createConsultaAction, updateConsultaAction } from "@/services/consultas.actions";
import { useToast } from "@/contexts/ToastContext";
import type { ConsultaComPaciente } from "@/services/consultas.queries";

const emptyForm: ConsultaFormValues = {
  paciente_id: "",
  data_hora: "",
  tipo: "presencial",
  status: "agendada",
  observacoes: "",
};

function toLocalInputValue(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function ConsultaFormModal({
  open,
  onClose,
  onSaved,
  consulta,
  pacientes,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  consulta?: ConsultaComPaciente | null;
  pacientes: { id: string; nome: string }[];
}) {
  const { toast } = useToast();
  const [values, setValues] = useState<ConsultaFormValues>(emptyForm);
  const [errors, setErrors] = useState<Partial<Record<keyof ConsultaFormValues, string>>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setErrors({});
    if (consulta) {
      setValues({
        paciente_id: consulta.auth_id,
        data_hora: toLocalInputValue(consulta.data ?? new Date().toISOString()),
        tipo: (consulta.tipo as "presencial" | "online") ?? "presencial",
        status: (consulta.status as "agendada" | "concluida" | "cancelada") ?? "agendada",
        observacoes: consulta.observacoes ?? "",
      });
    } else {
      setValues(emptyForm);
    }
  }, [open, consulta]);

  function setField<K extends keyof ConsultaFormValues>(key: K, value: ConsultaFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = consultaSchema.safeParse(values);
    if (!parsed.success) {
      const fieldErrors: typeof errors = {};
      for (const issue of parsed.error.issues) {
        fieldErrors[issue.path[0] as keyof ConsultaFormValues] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    setSaving(true);
    const payload = { ...values, data_hora: new Date(values.data_hora).toISOString() };
    const result = consulta
      ? await updateConsultaAction(consulta.id, payload)
      : await createConsultaAction(payload);
    setSaving(false);

    if (result.success) {
      toast({ kind: "success", title: result.message });
      onSaved();
      onClose();
    } else {
      toast({ kind: "error", title: "Não foi possível salvar", description: result.message });
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={consulta ? "Editar consulta" : "Nova consulta"}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <FieldGroup>
          <Label htmlFor="paciente_id">Paciente</Label>
          <Select
            id="paciente_id"
            value={values.paciente_id}
            onChange={(e) => setField("paciente_id", e.target.value)}
            error={errors.paciente_id}
          >
            <option value="">Selecione um paciente</option>
            {pacientes.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </Select>
        </FieldGroup>

        <FieldGroup>
          <Label htmlFor="data_hora">Data e hora</Label>
          <Input
            id="data_hora"
            type="datetime-local"
            value={values.data_hora}
            onChange={(e) => setField("data_hora", e.target.value)}
            error={errors.data_hora}
          />
        </FieldGroup>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FieldGroup>
            <Label htmlFor="tipo">Tipo</Label>
            <Select
              id="tipo"
              value={values.tipo}
              onChange={(e) => setField("tipo", e.target.value as "presencial" | "online")}
            >
              <option value="presencial">Presencial</option>
              <option value="online">On-line</option>
            </Select>
          </FieldGroup>
          <FieldGroup>
            <Label htmlFor="status">Status</Label>
            <Select
              id="status"
              value={values.status}
              onChange={(e) =>
                setField("status", e.target.value as "agendada" | "concluida" | "cancelada")
              }
            >
              <option value="agendada">Agendada</option>
              <option value="concluida">Concluída</option>
              <option value="cancelada">Cancelada</option>
            </Select>
          </FieldGroup>
        </div>

        <FieldGroup>
          <Label htmlFor="observacoes">Observações</Label>
          <Textarea
            id="observacoes"
            value={values.observacoes}
            onChange={(e) => setField("observacoes", e.target.value)}
          />
        </FieldGroup>

        <div className="mt-2 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={saving}>
            {consulta ? "Salvar alterações" : "Agendar consulta"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
