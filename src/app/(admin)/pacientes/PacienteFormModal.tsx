"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Label, FieldGroup } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { pacienteSchema, type PacienteFormValues } from "@/utils/validation/paciente";
import { createPacienteAction, updatePacienteAction } from "@/services/pacientes.actions";
import { useToast } from "@/contexts/ToastContext";
import type { Tables } from "@/types/database.types";
import { PasswordRevealModal } from "@/components/ui/PasswordRevealModal";

const emptyForm: PacienteFormValues = {
  nome: "",
  email: "",
  telefone: "",
  cpf: "",
  plano: "",
  status: "ativo",
  data_inicio: "",
};

export interface PacienteFormModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  paciente?: Tables<"pacientes"> | null;
}

export function PacienteFormModal({ open, onClose, onSaved, paciente }: PacienteFormModalProps) {
  const { toast } = useToast();
  const [values, setValues] = useState<PacienteFormValues>(emptyForm);
  const [errors, setErrors] = useState<Partial<Record<keyof PacienteFormValues, string>>>({});
  const [saving, setSaving] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setGeneratedPassword(null);
    if (paciente) {
      setValues({
        nome: paciente.nome ?? "",
        email: paciente.email ?? "",
        telefone: paciente.telefone ?? "",
        cpf: paciente.cpf ?? "",
        plano: paciente.plano ?? "",
        status:
          paciente.status === "inativo" || paciente.status === "pendente"
            ? paciente.status
            : "ativo",
        data_inicio: paciente.data_inicio ?? "",
      });
    } else {
      setValues(emptyForm);
    }
  }, [open, paciente]);

  function setField<K extends keyof PacienteFormValues>(key: K, value: PacienteFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = pacienteSchema.safeParse(values);
    if (!parsed.success) {
      const fieldErrors: typeof errors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof PacienteFormValues;
        fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    setSaving(true);
    const result = paciente
      ? await updatePacienteAction(paciente.id, values)
      : await createPacienteAction(values);
    setSaving(false);

    if (result.success) {
      toast({ kind: "success", title: result.message });
      onSaved();
      if (result.password) {
        setGeneratedPassword(result.password);
      } else {
        onClose();
      }
    } else {
      toast({ kind: "error", title: "Não foi possível salvar", description: result.message });
    }
  }

  return (
    <>
    <Modal
      open={open && !generatedPassword}
      onClose={onClose}
      title={paciente ? "Editar paciente" : "Novo paciente"}
      description={
        paciente
          ? "Atualize os dados cadastrais do paciente."
          : "Uma senha de acesso será gerada para o paciente ao salvar."
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <FieldGroup>
          <Label htmlFor="nome">Nome completo</Label>
          <Input
            id="nome"
            value={values.nome}
            onChange={(e) => setField("nome", e.target.value)}
            error={errors.nome}
            placeholder="Maria da Silva"
          />
        </FieldGroup>

        <FieldGroup>
          <Label htmlFor="email">E-mail</Label>
          <Input
            id="email"
            type="email"
            value={values.email}
            onChange={(e) => setField("email", e.target.value)}
            error={errors.email}
            placeholder="maria@email.com"
          />
        </FieldGroup>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FieldGroup>
            <Label htmlFor="telefone">Telefone</Label>
            <Input
              id="telefone"
              value={values.telefone}
              onChange={(e) => setField("telefone", e.target.value)}
              placeholder="(41) 99999-9999"
            />
          </FieldGroup>
          <FieldGroup>
            <Label htmlFor="cpf">CPF</Label>
            <Input
              id="cpf"
              value={values.cpf}
              onChange={(e) => setField("cpf", e.target.value)}
              placeholder="000.000.000-00"
            />
          </FieldGroup>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FieldGroup>
            <Label htmlFor="plano">Plano</Label>
            <Input
              id="plano"
              value={values.plano}
              onChange={(e) => setField("plano", e.target.value)}
              placeholder="Acompanhamento mensal"
            />
          </FieldGroup>
          <FieldGroup>
            <Label htmlFor="status">Status</Label>
            <Select
              id="status"
              value={values.status}
              onChange={(e) =>
                setField("status", e.target.value as "ativo" | "inativo" | "pendente")
              }
            >
              <option value="ativo">Ativo</option>
              <option value="inativo">Inativo</option>
              <option value="pendente">Pendente</option>
            </Select>
          </FieldGroup>
        </div>

        <FieldGroup>
          <Label htmlFor="data_inicio">Data de início</Label>
          <Input
            id="data_inicio"
            type="date"
            value={values.data_inicio}
            onChange={(e) => setField("data_inicio", e.target.value)}
          />
        </FieldGroup>

        <div className="mt-2 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={saving}>
            {paciente ? "Salvar alterações" : "Cadastrar paciente"}
          </Button>
        </div>
      </form>
    </Modal>
    <PasswordRevealModal
      open={!!generatedPassword}
      password={generatedPassword}
      pacienteNome={values.nome}
      onClose={() => {
        setGeneratedPassword(null);
        onClose();
      }}
    />
    </>
  );
}
