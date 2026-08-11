import { CheckCircle2, Clock3, FileText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import type { Tables } from "@/types/database.types";

const labels: Record<string, string> = {
  objetivo: "Objetivo principal",
  ultima_consulta: "Última consulta com nutricionista",
  experiencias_anteriores: "Experiências anteriores",
  maior_dificuldade: "Maior dificuldade",
  horarios_dificeis: "Horários de maior dificuldade",
  agua: "Consumo de água",
  frutas: "Consumo de frutas",
  sono: "Sono",
  intestino: "Hábito intestinal",
  alcool: "Bebidas alcoólicas",
  suplementos: "Suplementos",
  medicamentos: "Medicamentos",
  refeicoes_semana: "Refeições durante a semana",
  refeicoes_fim_semana: "Refeições aos finais de semana",
  alimentos_preferidos: "Alimentos preferidos",
  alimentos_evitar: "Alimentos que prefere evitar",
  atividade_fisica: "Atividade física",
  acompanhamento_exercicio: "Acompanhamento no exercício",
  peso_altura: "Peso e altura",
  informacoes_adicionais: "Informações adicionais",
};

export function PreConsultaTab({ formulario }: { formulario: Tables<"formularios_pre_consulta"> | null }) {
  if (!formulario) return <Card><CardContent className="py-12 text-center"><FileText className="mx-auto size-10 text-muted-light" /><h3 className="mt-3 text-lg font-bold text-ink">Formulário ainda não solicitado</h3><p className="mt-1 text-sm text-muted">Ele será criado automaticamente no agendamento da primeira consulta.</p></CardContent></Card>;
  const respostas = formulario.respostas && typeof formulario.respostas === "object" && !Array.isArray(formulario.respostas) ? formulario.respostas as Record<string, unknown> : {};
  const answered = formulario.status === "respondido";
  return (
    <div className="space-y-4">
      <Card><CardContent className="flex flex-wrap items-center justify-between gap-4 pt-6"><div className="flex items-center gap-3">{answered ? <CheckCircle2 className="size-8 text-success" /> : <Clock3 className="size-8 text-warning" />}<div><h3 className="font-bold text-ink">Pré-consulta</h3><p className="text-sm text-muted">{answered && formulario.respondido_em ? `Respondido em ${new Date(formulario.respondido_em).toLocaleString('pt-BR')}` : 'Aguardando o paciente responder'}</p></div></div><Badge tone={answered ? "success" : "warning"}>{answered ? "Respondido" : "Pendente"}</Badge></CardContent></Card>
      {answered && <div className="grid gap-3 sm:grid-cols-2">{Object.entries(labels).map(([key, label]) => <Card key={key}><CardContent className="pt-6"><p className="text-xs font-bold uppercase tracking-wider text-muted">{label}</p><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-ink">{String(respostas[key] || "Não informado")}</p></CardContent></Card>)}</div>}
    </div>
  );
}
