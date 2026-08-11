import { CheckCircle2, Clock3, FileText, MessageCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
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

function whatsappLink(patient: Pick<Tables<"pacientes">, "nome" | "telefone" | "email">) {
  const phone = (patient.telefone ?? "").replace(/\D/g, "");
  if (!phone) return null;
  const destination = phone.startsWith("55") ? phone : `55${phone}`;
  const accessUrl = "https://admin-nutri-thales.vercel.app/paciente/login";
  const message = [
    `Olá, ${patient.nome ?? "tudo bem"}!`,
    "Seu questionário de pré-consulta já está disponível.",
    `Acesse: ${accessUrl}`,
    `Use o mesmo e-mail informado no agendamento: ${patient.email ?? ""}`,
    "Você receberá um link seguro no e-mail para preencher o formulário e acessar o manual da primeira consulta.",
  ].join("\n\n");
  return `https://wa.me/${destination}?text=${encodeURIComponent(message)}`;
}

export function PreConsultaTab({
  formulario,
  paciente,
}: {
  formulario: Tables<"formularios_pre_consulta"> | null;
  paciente: Pick<Tables<"pacientes">, "nome" | "telefone" | "email">;
}) {
  if (!formulario) return <Card><CardContent className="py-12 text-center"><FileText className="mx-auto size-10 text-muted-light" /><h3 className="mt-3 text-lg font-bold text-ink">Formulário ainda não solicitado</h3><p className="mt-1 text-sm text-muted">Ele será criado automaticamente no agendamento da primeira consulta.</p></CardContent></Card>;
  const respostas = formulario.respostas && typeof formulario.respostas === "object" && !Array.isArray(formulario.respostas) ? formulario.respostas as Record<string, unknown> : {};
  const answered = formulario.status === "respondido";
  const whatsapp = whatsappLink(paciente);
  return (
    <div className="space-y-4">
      <Card><CardContent className="flex flex-wrap items-center justify-between gap-4 pt-6"><div className="flex items-center gap-3">{answered ? <CheckCircle2 className="size-8 text-success" /> : <Clock3 className="size-8 text-warning" />}<div><h3 className="font-bold text-ink">Pré-consulta</h3><p className="text-sm text-muted">{answered && formulario.respondido_em ? `Respondido em ${new Date(formulario.respondido_em).toLocaleString('pt-BR')}` : 'Aguardando o paciente responder'}</p></div></div><div className="flex flex-wrap items-center gap-2">{!answered && whatsapp && <a href={whatsapp} target="_blank" rel="noreferrer"><Button size="sm"><MessageCircle className="size-4" /> Enviar questionário pelo WhatsApp</Button></a>}<Badge tone={answered ? "success" : "warning"}>{answered ? "Respondido" : "Pendente"}</Badge></div></CardContent></Card>
      {answered && <div className="grid gap-3 sm:grid-cols-2">{Object.entries(labels).map(([key, label]) => <Card key={key}><CardContent className="pt-6"><p className="text-xs font-bold uppercase tracking-wider text-muted">{label}</p><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-ink">{String(respostas[key] || "Não informado")}</p></CardContent></Card>)}</div>}
    </div>
  );
}
