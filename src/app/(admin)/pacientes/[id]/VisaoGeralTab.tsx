"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { FieldGroup, Input, Label, Textarea } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useToast } from "@/contexts/ToastContext";
import type { Tables } from "@/types/database.types";
import type { ConsultaComProntuario } from "@/services/prontuarios.queries";
import { updatePacienteComDemografiaAction } from "@/services/paciente-demografia.actions";
import { setPacienteStatusAction } from "@/services/pacientes.actions";
import { pacienteSchema, type PacienteFormValues } from "@/utils/validation/paciente";
import {
  CONSULTA_STATUS_LABEL,
  CONSULTA_STATUS_TONE,
  type ConsultaStatus,
} from "@/lib/clara/consultas";

type PacienteDetalhado = Tables<"pacientes"> & {
  sexo_biologico?: string | null;
};

function initialValues(paciente: PacienteDetalhado): PacienteFormValues {
  return {
    nome: paciente.nome ?? "",
    email: paciente.email ?? "",
    telefone: paciente.telefone ?? "",
    cpf: paciente.cpf ?? "",
    data_nascimento: paciente.data_nascimento ?? "",
    sexo_biologico:
      paciente.sexo_biologico === "masculino" || paciente.sexo_biologico === "feminino"
        ? paciente.sexo_biologico
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
  };
}

export function VisaoGeralTab({ paciente, consultas }: { paciente: PacienteDetalhado; consultas: ConsultaComProntuario[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [values, setValues] = useState<PacienteFormValues>(() => initialValues(paciente));
  const [restricoesInput, setRestricoesInput] = useState((paciente.restricoes_alimentares ?? []).join(", "));
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof PacienteFormValues, string>>>({});
  const realizadas = consultas.filter((consulta) => consulta.status === "realizada");

  function setField<K extends keyof PacienteFormValues>(key: K, value: PacienteFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    const payload: PacienteFormValues = {
      ...values,
      restricoes_alimentares: restricoesInput
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    };

    const parsed = pacienteSchema.safeParse(payload);
    if (!parsed.success) {
      const fieldErrors: Partial<Record<keyof PacienteFormValues, string>> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof PacienteFormValues;
        fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      toast({ kind: "error", title: "Revise os campos destacados" });
      return;
    }

    setSaving(true);
    setErrors({});

    // Se um paciente inativo passar para pendente, libere o Auth antes de
    // persistir o status pendente. Para ativo/inativo, a action de status
    // sincroniza banco e Supabase Auth depois do salvamento principal.
    if (paciente.status === "inativo" && parsed.data.status === "pendente") {
      const accessResult = await setPacienteStatusAction(paciente.id, "ativo");
      if (!accessResult.success) {
        setSaving(false);
        toast({ kind: "error", title: "Não foi possível liberar o acesso", description: accessResult.message });
        return;
      }
    }

    const result = await updatePacienteComDemografiaAction(paciente.id, parsed.data);
    if (!result.success) {
      setSaving(false);
      toast({ kind: "error", title: "Não foi possível salvar", description: result.message });
      return;
    }

    if (
      parsed.data.status !== paciente.status &&
      (parsed.data.status === "ativo" || parsed.data.status === "inativo")
    ) {
      const statusResult = await setPacienteStatusAction(paciente.id, parsed.data.status);
      if (!statusResult.success) {
        setSaving(false);
        toast({ kind: "error", title: "Dados salvos, mas o acesso não foi sincronizado", description: statusResult.message });
        router.refresh();
        return;
      }
    }

    setSaving(false);
    toast({ kind: "success", title: "Ficha do paciente atualizada" });
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      <section>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-bold text-ink">Dados do paciente</h2>
            <p className="text-sm text-muted">Edite as informações diretamente nesta ficha e salve ao final.</p>
          </div>
          <Badge tone={values.status === "ativo" ? "success" : values.status === "pendente" ? "warning" : "muted"}>
            {values.status === "ativo" ? "Ativo" : values.status === "pendente" ? "Pendente" : "Inativo"}
          </Badge>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              <FieldGroup className="md:col-span-2 xl:col-span-1">
                <Label htmlFor="ficha-nome">Nome completo</Label>
                <Input id="ficha-nome" value={values.nome} onChange={(e) => setField("nome", e.target.value)} error={errors.nome} />
              </FieldGroup>

              <FieldGroup>
                <Label htmlFor="ficha-email">E-mail</Label>
                <Input id="ficha-email" type="email" value={values.email} onChange={(e) => setField("email", e.target.value)} error={errors.email} />
              </FieldGroup>

              <FieldGroup>
                <Label htmlFor="ficha-telefone">Telefone</Label>
                <Input id="ficha-telefone" value={values.telefone ?? ""} onChange={(e) => setField("telefone", e.target.value)} />
              </FieldGroup>

              <FieldGroup>
                <Label htmlFor="ficha-cpf">CPF</Label>
                <Input id="ficha-cpf" value={values.cpf ?? ""} onChange={(e) => setField("cpf", e.target.value)} />
              </FieldGroup>

              <FieldGroup>
                <Label htmlFor="ficha-nascimento">Data de nascimento</Label>
                <Input id="ficha-nascimento" type="date" value={values.data_nascimento ?? ""} onChange={(e) => setField("data_nascimento", e.target.value)} error={errors.data_nascimento} />
              </FieldGroup>

              <FieldGroup>
                <Label htmlFor="ficha-sexo">Sexo biológico</Label>
                <Select id="ficha-sexo" value={values.sexo_biologico ?? ""} onChange={(e) => setField("sexo_biologico", e.target.value as "masculino" | "feminino" | "")}>
                  <option value="">Selecione</option>
                  <option value="feminino">Feminino</option>
                  <option value="masculino">Masculino</option>
                </Select>
                {errors.sexo_biologico && <p className="text-xs text-danger">{errors.sexo_biologico}</p>}
              </FieldGroup>

              <FieldGroup>
                <Label htmlFor="ficha-inicio">Início do acompanhamento</Label>
                <Input id="ficha-inicio" type="date" value={values.data_inicio ?? ""} onChange={(e) => setField("data_inicio", e.target.value)} />
              </FieldGroup>

              <FieldGroup>
                <Label htmlFor="ficha-plano">Plano</Label>
                <Input id="ficha-plano" value={values.plano ?? ""} onChange={(e) => setField("plano", e.target.value)} />
              </FieldGroup>

              <FieldGroup>
                <Label htmlFor="ficha-status">Status</Label>
                <Select id="ficha-status" value={values.status} onChange={(e) => setField("status", e.target.value as "ativo" | "inativo" | "pendente")}>
                  <option value="ativo">Ativo</option>
                  <option value="inativo">Inativo</option>
                  <option value="pendente">Pendente</option>
                </Select>
              </FieldGroup>

              <FieldGroup>
                <Label htmlFor="ficha-peso">Peso (kg)</Label>
                <Input id="ficha-peso" type="number" step="0.1" value={values.peso_kg ?? ""} onChange={(e) => setField("peso_kg", e.target.value === "" ? undefined : Number(e.target.value))} />
              </FieldGroup>

              <FieldGroup>
                <Label htmlFor="ficha-altura">Altura (cm)</Label>
                <Input id="ficha-altura" type="number" step="0.1" value={values.altura_cm ?? ""} onChange={(e) => setField("altura_cm", e.target.value === "" ? undefined : Number(e.target.value))} />
              </FieldGroup>

              <FieldGroup>
                <Label htmlFor="ficha-objetivo">Objetivo</Label>
                <Select id="ficha-objetivo" value={values.objetivo ?? ""} onChange={(e) => setField("objetivo", e.target.value)}>
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
                <Label htmlFor="ficha-atividade">Nível de atividade</Label>
                <Select id="ficha-atividade" value={values.nivel_atividade ?? ""} onChange={(e) => setField("nivel_atividade", e.target.value)}>
                  <option value="">Selecione</option>
                  <option value="sedentario">Sedentário</option>
                  <option value="leve">Leve</option>
                  <option value="moderado">Moderado</option>
                  <option value="intenso">Intenso</option>
                </Select>
              </FieldGroup>

              <FieldGroup>
                <Label htmlFor="ficha-treinos">Treinos por semana</Label>
                <Input id="ficha-treinos" type="number" min={0} max={14} value={values.treino_frequencia_semanal ?? ""} onChange={(e) => setField("treino_frequencia_semanal", e.target.value === "" ? undefined : Number(e.target.value))} error={errors.treino_frequencia_semanal} />
              </FieldGroup>

              <FieldGroup className="md:col-span-2 xl:col-span-3">
                <Label htmlFor="ficha-restricoes">Restrições alimentares</Label>
                <Input id="ficha-restricoes" value={restricoesInput} onChange={(e) => setRestricoesInput(e.target.value)} placeholder="Separe por vírgulas" />
              </FieldGroup>

              <FieldGroup className="md:col-span-2 xl:col-span-3">
                <Label htmlFor="ficha-preferencias">Preferências e rotina alimentar</Label>
                <Textarea id="ficha-preferencias" value={values.preferencias_alimentares ?? ""} onChange={(e) => setField("preferencias_alimentares", e.target.value)} rows={4} />
              </FieldGroup>
            </div>

            <div className="mt-5 flex justify-end">
              <Button type="button" onClick={handleSave} loading={saving}>Salvar alterações</Button>
            </div>
          </CardContent>
        </Card>
      </section>

      <section>
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-ink">Histórico de consultas</h2>
            <p className="text-sm text-muted">Registro cronológico de atendimentos e agendamentos deste paciente.</p>
          </div>
          <div className="flex gap-2">
            <Badge tone="success">{realizadas.length} realizada(s)</Badge>
            <Badge tone="muted">{consultas.length} registro(s)</Badge>
          </div>
        </div>

        {consultas.length === 0 ? (
          <Card><CardContent className="py-8 text-center text-sm text-muted">Nenhuma consulta registrada para este paciente.</CardContent></Card>
        ) : (
          <div className="flex flex-col gap-3">
            {consultas.map((consulta) => {
              const status = consulta.status as ConsultaStatus;
              return (
                <Card key={consulta.id}>
                  <CardContent className="flex flex-col gap-3 pt-6 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-3">
                      <div className="rounded-full bg-brand-light p-2.5 text-brand-dark">
                        {consulta.status === "realizada" ? <CheckCircle2 className="size-4" /> : <CalendarDays className="size-4" />}
                      </div>
                      <div>
                        <p className="font-semibold text-ink">{consulta.data ? new Date(consulta.data).toLocaleString("pt-BR", { dateStyle: "medium", timeStyle: "short" }) : "Consulta sem data"}</p>
                        <p className="text-sm text-muted">{consulta.tipo === "presencial" ? "Presencial" : "On-line"}{consulta.prontuario ? " · prontuário registrado" : ""}</p>
                      </div>
                    </div>
                    <Badge tone={CONSULTA_STATUS_TONE[status] ?? "muted"}>{CONSULTA_STATUS_LABEL[status] ?? consulta.status ?? "Sem status"}</Badge>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
