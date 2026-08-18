"use client";

import {
  Activity,
  CalendarDays,
  CheckCircle2,
  Dumbbell,
  Mail,
  Phone,
  Ruler,
  Scale,
  Target,
  UserRound,
  Wallet,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent } from "@/components/ui/Card";
import type { Tables } from "@/types/database.types";
import type { ConsultaComProntuario } from "@/services/prontuarios.queries";
import {
  CONSULTA_STATUS_LABEL,
  CONSULTA_STATUS_TONE,
  type ConsultaStatus,
} from "@/lib/clara/consultas";

type PacienteDetalhado = Tables<"pacientes"> & {
  sexo_biologico?: string | null;
};

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("pt-BR");
}

function InfoItem({ icon: Icon, label, value }: { icon: typeof UserRound; label: string; value: React.ReactNode }) {
  return (
    <div className="flex min-w-0 items-start gap-3 rounded-lg border border-border bg-white p-3">
      <div className="rounded-full bg-brand-light p-2 text-brand-dark"><Icon className="size-4" /></div>
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
        <div className="mt-0.5 break-words text-sm font-semibold text-ink">{value || "—"}</div>
      </div>
    </div>
  );
}

export function VisaoGeralTab({ paciente, consultas }: { paciente: PacienteDetalhado; consultas: ConsultaComProntuario[] }) {
  const realizadas = consultas.filter((consulta) => consulta.status === "realizada");
  const restricoes = paciente.restricoes_alimentares ?? [];

  return (
    <div className="flex flex-col gap-6">
      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-ink">Dados do paciente</h2>
            <p className="text-sm text-muted">Informações cadastrais e dados-base usados no acompanhamento.</p>
          </div>
          <Badge tone={paciente.status === "ativo" ? "success" : paciente.status === "pendente" ? "warning" : "muted"}>
            {paciente.status === "ativo" ? "Ativo" : paciente.status === "pendente" ? "Pendente" : "Inativo"}
          </Badge>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <InfoItem icon={Mail} label="E-mail" value={paciente.email ?? "—"} />
          <InfoItem icon={Phone} label="Telefone" value={paciente.telefone ?? "—"} />
          <InfoItem icon={UserRound} label="CPF" value={paciente.cpf ?? "—"} />
          <InfoItem icon={CalendarDays} label="Nascimento" value={formatDate(paciente.data_nascimento)} />
          <InfoItem icon={UserRound} label="Sexo biológico" value={paciente.sexo_biologico === "feminino" ? "Feminino" : paciente.sexo_biologico === "masculino" ? "Masculino" : "—"} />
          <InfoItem icon={CalendarDays} label="Início do acompanhamento" value={formatDate(paciente.data_inicio)} />
          <InfoItem icon={Wallet} label="Plano" value={paciente.plano ?? "Sem plano definido"} />
          <InfoItem icon={Scale} label="Peso cadastrado" value={paciente.peso_kg ? `${paciente.peso_kg} kg` : "—"} />
          <InfoItem icon={Ruler} label="Altura cadastrada" value={paciente.altura_cm ? `${paciente.altura_cm} cm` : "—"} />
          <InfoItem icon={Target} label="Objetivo" value={paciente.objetivo ?? "—"} />
          <InfoItem icon={Activity} label="Nível de atividade" value={paciente.nivel_atividade ?? "—"} />
          <InfoItem icon={Dumbbell} label="Treinos por semana" value={paciente.treino_frequencia_semanal != null ? `${paciente.treino_frequencia_semanal}x/semana` : "—"} />
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card><CardContent className="pt-6"><h3 className="font-bold text-ink">Restrições alimentares</h3>{restricoes.length > 0 ? <div className="mt-3 flex flex-wrap gap-2">{restricoes.map((item) => <Badge key={item} tone="warning">{item}</Badge>)}</div> : <p className="mt-2 text-sm text-muted">Nenhuma restrição cadastrada.</p>}</CardContent></Card>
        <Card><CardContent className="pt-6"><h3 className="font-bold text-ink">Preferências alimentares</h3><p className="mt-2 whitespace-pre-wrap text-sm text-muted">{paciente.preferencias_alimentares || "Nenhuma preferência cadastrada."}</p></CardContent></Card>
      </div>

      <section>
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <div><h2 className="text-base font-bold text-ink">Histórico de consultas</h2><p className="text-sm text-muted">Registro cronológico de atendimentos e agendamentos deste paciente.</p></div>
          <div className="flex gap-2"><Badge tone="success">{realizadas.length} realizada(s)</Badge><Badge tone="muted">{consultas.length} registro(s)</Badge></div>
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
                      <div className="rounded-full bg-brand-light p-2.5 text-brand-dark">{consulta.status === "realizada" ? <CheckCircle2 className="size-4" /> : <CalendarDays className="size-4" />}</div>
                      <div><p className="font-semibold text-ink">{consulta.data ? new Date(consulta.data).toLocaleString("pt-BR", { dateStyle: "medium", timeStyle: "short" }) : "Consulta sem data"}</p><p className="text-sm text-muted">{consulta.tipo === "presencial" ? "Presencial" : "On-line"}{consulta.prontuario ? " · prontuário registrado" : ""}</p></div>
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
