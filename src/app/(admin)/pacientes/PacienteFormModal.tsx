"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Label, FieldGroup, Textarea } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { pacienteSchema, type PacienteFormValues } from "@/utils/validation/paciente";
import {
  createPacienteComDemografiaAction,
  updatePacienteComDemografiaAction,
} from "@/services/paciente-demografia.actions";
import { useToast } from "@/contexts/ToastContext";
import type { Tables } from "@/types/database.types";
import { PasswordRevealModal } from "@/components/ui/PasswordRevealModal";

const emptyForm: PacienteFormValues = {
  nome: "",
  email: "",
  telefone: "",
  cpf: "",
  data_nascimento: "",
  sexo_biologico: "",
  plano: "",
  status: "ativo",
  data_inicio: "",
  peso_kg: undefined,
  altura_cm: undefined,
  objetivo: "",
  nivel_atividade: "",
  treino_frequencia_semanal: undefined,
  restricoes_alimentares: [],
  preferencias_alimentares: "",
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
  const [restricoesInput, setRestricoesInput] = useState("");

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setGeneratedPassword(null);
    if (paciente) {
      const pacienteComSexo = paciente as Tables<"pacientes"> & { sexo_biologico?: string | null };
      setValues({
        nome: paciente.nome ?? "",
        email: paciente.email ?? "",
        telefone: paciente.telefone ?? "",
        cpf: paciente.cpf ?? "",
        data_nascimento: paciente.data_nascimento ?? "",
        sexo_biologico:
          pacienteComSexo.sexo_biologico === "masculino" || pacienteComSexo.sexo_biologico === "feminino"
            ? pacienteComSexo.sexo_biologico
            : "",
        plano: paciente.plano ?? "",
        status:
          paciente.status === "inativo" || paciente.status === "pendente"
            ? paciente.status
            : "ativo",
        data_inicio: paciente.data_inicio ?? "",
        peso_kg: paciente.peso_kg ?? undefined,
        altura_cm: paciente.altura_cm ?? undefined,
        objetivo: paciente.objetivo ?? "",
        nivel_atividade: paciente.nivel_atividade ?? "",
        treino_frequencia_semanal: paciente.treino_frequencia_semanal ?? undefined,
        restricoes_alimentares: paciente.restricoes_alimentares ?? [],
        preferencias_alimentares: paciente.preferencias_alimentares ?? "",
      });
      setRestricoesInput((paciente.restricoes_alimentares ?? []).join(", "));
    } else {
      setValues(emptyForm);
      setRestricoesInput("");
    }
  }, [open, paciente]);

  function setField<K extends keyof PacienteFormValues>(key: K, value: PacienteFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload: PacienteFormValues = {
      ...values,
      restricoes_alimentares: restricoesInput
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    };

    if (!paciente && !payload.data_nascimento) {
      setErrors((prev) => ({ ...prev, data_nascimento: "Informe a data de nascimento." }));
      return;
    }

    if (!paciente && !payload.sexo_biologico) {
      setErrors((prev) => ({ ...prev, sexo_biologico: "Informe o sexo biológico." }));
      return;
    }

    const parsed = pacienteSchema.safeParse(payload);
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
      ? await updatePacienteComDemografiaAction(paciente.id, parsed.data)
      : await createPacienteComDemografiaAction(parsed.data);
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
          <Input id="nome" value={values.nome} onChange={(e) => setField("nome", e.target.value)} error={errors.nome} placeholder="Maria da Silva" />
        </FieldGroup>

        <FieldGroup>
          <Label htmlFor="email">E-mail</Label>
          <Input id="email" type="email" value={values.email} onChange={(e) => setField("email", e.target.value)} error={errors.email} placeholder="maria@email.com" />
        </FieldGroup>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FieldGroup>
            <Label htmlFor="telefone">Telefone</Label>
            <Input id="telefone" value={values.telefone} onChange={(e) => setField("telefone", e.target.value)} placeholder="(41) 99999-9999" />
          </FieldGroup>
          <FieldGroup>
            <Label htmlFor="cpf">CPF</Label>
            <Input id="cpf" value={values.cpf} onChange={(e) => setField("cpf", e.target.value)} placeholder="000.000.000-00" />
          </FieldGroup>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FieldGroup>
            <Label htmlFor="data_nascimento">Data de nascimento{paciente ? "" : " *"}</Label>
            <Input id="data_nascimento" type="date" value={values.data_nascimento ?? ""} onChange={(e) => setField("data_nascimento", e.target.value)} error={errors.data_nascimento} />
            <p className="text-xs text-muted">Usada para calcular automaticamente a idade na Matriz Nutricional.</p>
          </FieldGroup>
          <FieldGroup>
            <Label htmlFor="sexo_biologico">Sexo biológico{paciente ? "" : " *"}</Label>
            <Select
              id="sexo_biologico"
              value={values.sexo_biologico ?? ""}
              onChange={(e) => setField("sexo_biologico", e.target.value as "masculino" | "feminino" | "")}
            >
              <option value="">Selecione</option>
              <option value="feminino">Feminino</option>
              <option value="masculino">Masculino</option>
            </Select>
            {errors.sexo_biologico && <p className="text-xs text-danger">{errors.sexo_biologico}</p>}
            <p className="text-xs text-muted">Usado no cálculo da Harris-Benedict na Matriz Nutricional.</p>
          </FieldGroup>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FieldGroup>
            <Label htmlFor="plano">Plano</Label>
            <Input id="plano" value={values.plano} onChange={(e) => setField("plano", e.target.value)} placeholder="Acompanhamento mensal" />
          </FieldGroup>
          <FieldGroup>
            <Label htmlFor="status">Status</Label>
            <Select id="status" value={values.status} onChange={(e) => setField("status", e.target.value as "ativo" | "inativo" | "pendente")}>
              <option value="ativo">Ativo</option>
              <option value="inativo">Inativo</option>
              <option value="pendente">Pendente</option>
            </Select>
          </FieldGroup>
        </div>

        <FieldGroup>
          <Label htmlFor="data_inicio">Data de início</Label>
          <Input id="data_inicio" type="date" value={values.data_inicio} onChange={(e) => setField("data_inicio", e.target.value)} />
        </FieldGroup>

        <p className="text-sm font-semibold text-ink">Dados que influenciam a dieta</p>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <FieldGroup>
            <Label htmlFor="peso_kg">Peso (kg)</Label>
            <Input id="peso_kg" type="number" step="0.1" value={values.peso_kg ?? ""} onChange={(e) => setField("peso_kg", e.target.value === "" ? undefined : Number(e.target.value))} />
          </FieldGroup>
          <FieldGroup>
            <Label htmlFor="altura_cm">Altura (cm)</Label>
            <Input id="altura_cm" type="number" step="0.1" value={values.altura_cm ?? ""} onChange={(e) => setField("altura_cm", e.target.value === "" ? undefined : Number(e.target.value))} />
          </FieldGroup>
          <FieldGroup className="col-span-2 sm:col-span-1">
            <Label htmlFor="nivel_atividade">Nível de atividade</Label>
            <Select id="nivel_atividade" value={values.nivel_atividade} onChange={(e) => setField("nivel_atividade", e.target.value)}>
              <option value="">Selecione</option>
              <option value="sedentario">Sedentário</option>
              <option value="leve">Leve</option>
              <option value="moderado">Moderado</option>
              <option value="intenso">Intenso</option>
            </Select>
          </FieldGroup>
          <FieldGroup>
            <Label htmlFor="treino_frequencia_semanal">Treinos/semana</Label>
            <Input id="treino_frequencia_semanal" type="number" min={0} max={14} value={values.treino_frequencia_semanal ?? ""} onChange={(e) => setField("treino_frequencia_semanal", e.target.value === "" ? undefined : Number(e.target.value))} />
          </FieldGroup>
        </div>

        <FieldGroup>
          <Label htmlFor="objetivo">Objetivo</Label>
          <Select id="objetivo" value={values.objetivo} onChange={(e) => setField("objetivo", e.target.value)}>
            <option value="">Selecione</option>
            <option value="emagrecimento">Emagrecimento</option>
            <option value="recomposicao">Recomposição corporal</option>
            <option value="hipertrofia">Hipertrofia</option>
            <option value="manutencao">Manutenção</option>
            <option value="performance">Performance</option>
            <option value="saude_geral">Saúde geral</option>
          </Select>
        </FieldGroup>

        <FieldGroup>
          <Label htmlFor="restricoes_alimentares">Restrições alimentares (separadas por vírgula)</Label>
          <Input id="restricoes_alimentares" placeholder="ex.: vegetariano, sem_lactose, sem_gluten" value={restricoesInput} onChange={(e) => setRestricoesInput(e.target.value)} />
        </FieldGroup>

        <FieldGroup>
          <Label htmlFor="preferencias_alimentares">Preferências e rotina</Label>
          <Textarea id="preferencias_alimentares" placeholder="ex.: não gosta de peixe, prefere refeições práticas, come fora no almoço..." value={values.preferencias_alimentares} onChange={(e) => setField("preferencias_alimentares", e.target.value)} />
        </FieldGroup>

        <div className="mt-2 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={saving}>{paciente ? "Salvar alterações" : "Cadastrar paciente"}</Button>
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
