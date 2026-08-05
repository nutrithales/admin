"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Label, FieldGroup } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { paginaSchema, type PaginaFormValues } from "@/utils/validation/pagina";
import { createPaginaAction, updatePaginaAction } from "@/services/paginas.actions";
import { TIPOS_PAGINA_SUGERIDOS } from "@/utils/constants";
import { useToast } from "@/contexts/ToastContext";
import type { PaginaPacienteComPaciente } from "@/services/paginas.queries";

const emptyForm: PaginaFormValues = {
  paciente_id: "",
  tipo: "",
  titulo: "",
  icone: "",
  url: "",
  ordem: 0,
  ativo: true,
};

export interface PaginaFormModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  pagina?: PaginaPacienteComPaciente | null;
  pacientes: { id: string; nome: string }[];
  defaultPacienteId?: string;
}

export function PaginaFormModal({
  open,
  onClose,
  onSaved,
  pagina,
  pacientes,
  defaultPacienteId,
}: PaginaFormModalProps) {
  const { toast } = useToast();
  const [values, setValues] = useState<PaginaFormValues>(emptyForm);
  const [errors, setErrors] = useState<Partial<Record<keyof PaginaFormValues, string>>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setErrors({});
    if (pagina) {
      setValues({
        paciente_id: pagina.user_id,
        tipo: pagina.tipo,
        titulo: pagina.titulo,
        icone: pagina.icone ?? "",
        url: pagina.url_pagina,
        ordem: pagina.ordem,
        ativo: pagina.ativo,
      });
    } else {
      setValues({ ...emptyForm, paciente_id: defaultPacienteId ?? "" });
    }
  }, [open, pagina, defaultPacienteId]);

  function setField<K extends keyof PaginaFormValues>(key: K, value: PaginaFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = paginaSchema.safeParse(values);
    if (!parsed.success) {
      const fieldErrors: typeof errors = {};
      for (const issue of parsed.error.issues) {
        fieldErrors[issue.path[0] as keyof PaginaFormValues] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    setSaving(true);
    const result = pagina
      ? await updatePaginaAction(pagina.id, values)
      : await createPaginaAction(values);
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
    <Modal
      open={open}
      onClose={onClose}
      title={pagina ? "Editar página personalizada" : "Nova página personalizada"}
      description="Cada página aponta para uma URL própria (ex: um projeto hospedado na Vercel)."
    >
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

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FieldGroup>
            <Label htmlFor="tipo">Tipo</Label>
            <Input
              id="tipo"
              list="tipos-pagina"
              value={values.tipo}
              onChange={(e) => setField("tipo", e.target.value)}
              error={errors.tipo}
              placeholder="dashboard"
            />
            <datalist id="tipos-pagina">
              {TIPOS_PAGINA_SUGERIDOS.map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
          </FieldGroup>
          <FieldGroup>
            <Label htmlFor="icone">Ícone</Label>
            <Input
              id="icone"
              value={values.icone}
              onChange={(e) => setField("icone", e.target.value)}
              placeholder="layout-dashboard"
            />
          </FieldGroup>
        </div>

        <FieldGroup>
          <Label htmlFor="titulo">Título</Label>
          <Input
            id="titulo"
            value={values.titulo}
            onChange={(e) => setField("titulo", e.target.value)}
            error={errors.titulo}
            placeholder="Diário Alimentar"
          />
        </FieldGroup>

        <FieldGroup>
          <Label htmlFor="url">URL</Label>
          <Input
            id="url"
            value={values.url}
            onChange={(e) => setField("url", e.target.value)}
            error={errors.url}
            placeholder="https://diario.meusite.vercel.app"
          />
        </FieldGroup>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FieldGroup>
            <Label htmlFor="ordem">Ordem</Label>
            <Input
              id="ordem"
              type="number"
              min={0}
              value={values.ordem}
              onChange={(e) => setField("ordem", Number(e.target.value))}
            />
          </FieldGroup>
          <FieldGroup>
            <Label htmlFor="ativo">Status</Label>
            <Select
              id="ativo"
              value={values.ativo ? "1" : "0"}
              onChange={(e) => setField("ativo", e.target.value === "1")}
            >
              <option value="1">Ativa</option>
              <option value="0">Inativa</option>
            </Select>
          </FieldGroup>
        </div>

        <div className="mt-2 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={saving}>
            {pagina ? "Salvar alterações" : "Criar página"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
