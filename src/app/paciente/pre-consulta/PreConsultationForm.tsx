"use client";

import { useMemo, useState } from "react";
import { BookOpenText, CheckCircle2, Download, LogOut, Save, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/types/database.types";

type Patient = Pick<Tables<"pacientes">, "id" | "nome" | "email" | "cpf" | "data_nascimento">;
type AnswerMap = Record<string, string>;
type Question = { id: string; label: string; type?: "text" | "choice"; options?: string[]; required?: boolean };

const questions: Question[] = [
  { id: "objetivo", label: "Qual é o seu principal objetivo hoje?", required: true },
  { id: "ultima_consulta", label: "Quando foi a última vez que você esteve em um nutricionista?", type: "choice", options: ["É a minha primeira vez", "Há menos de 3 meses", "Entre 3 e 6 meses", "Há mais de 6 meses"], required: true },
  { id: "experiencias_anteriores", label: "O que você sentiu que funcionou ou não funcionou nos acompanhamentos anteriores?" },
  { id: "maior_dificuldade", label: "O que você considera que pode ser sua maior dificuldade ao seguir uma estratégia alimentar?", required: true },
  { id: "horarios_dificeis", label: "Existem horários em que sente mais dificuldade para controlar a alimentação?" },
  { id: "agua", label: "Você toma água regularmente?", type: "choice", options: ["Sim, cerca de 2 litros por dia", "Sim, mais de 3 litros por dia", "Tenho dificuldade, esqueço com frequência", "Varia, tomo por volta de 500 ml a 1 litro"], required: true },
  { id: "frutas", label: "Você consome frutas frequentemente?", type: "choice", options: ["Sim, todos os dias", "Sim, pelo menos 3 vezes por semana", "Raramente, mas gosto", "Não gosto de frutas"], required: true },
  { id: "sono", label: "Como você considera o seu sono?", type: "choice", options: ["Durmo bem, geralmente mais de 7 horas", "Durmo pouco, geralmente menos de 6 horas", "Varia muito e preciso de ajuda"], required: true },
  { id: "intestino", label: "Você tem um hábito intestinal regular?", type: "choice", options: ["Sim, vou ao banheiro todos os dias", "Tenho dificuldade e preciso de ajuda", "Vou ao banheiro dia sim, dia não"], required: true },
  { id: "alcool", label: "Você consome bebidas alcoólicas?", type: "choice", options: ["Não bebo", "Sim, mas de vez em quando", "Sim, aos finais de semana", "Sim, com frequência durante a semana"], required: true },
  { id: "suplementos", label: "Você faz uso de suplementos alimentares? Se sim, quais?" },
  { id: "medicamentos", label: "Você faz uso de medicamentos? Se sim, quais?" },
  { id: "refeicoes_semana", label: "Quantas refeições você costuma fazer por dia durante a semana?" },
  { id: "refeicoes_fim_semana", label: "E aos finais de semana?" },
  { id: "alimentos_preferidos", label: "Existe algum alimento que você adora e gostaria que fizesse parte da sua alimentação?" },
  { id: "alimentos_evitar", label: "Tem algum alimento ou grupo alimentar que você não gostaria de ter na sua alimentação?" },
  { id: "atividade_fisica", label: "Você pratica atividade física? Se sim, qual, há quanto tempo, em que horário e quantos dias por semana?" },
  { id: "acompanhamento_exercicio", label: "Você possui acompanhamento profissional no exercício físico?" },
  { id: "peso_altura", label: "Peso e altura (opcional)" },
  { id: "informacoes_adicionais", label: "Há alguma outra informação, feedback ou observação que você considera importante compartilhar?" },
];

export function PreConsultationForm({ patient, initialForm, manualAvailable }: { patient: Patient; initialForm: Tables<"formularios_pre_consulta">; manualAvailable: boolean }) {
  const initialAnswers = (initialForm.respostas && typeof initialForm.respostas === "object" && !Array.isArray(initialForm.respostas) ? initialForm.respostas : {}) as AnswerMap;
  const [answers, setAnswers] = useState<AnswerMap>(initialAnswers);
  const [consent, setConsent] = useState(initialForm.consentimento_dados_saude);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(initialForm.status === "respondido");
  const [error, setError] = useState<string | null>(null);
  const missingRequired = useMemo(() => questions.some((q) => q.required && !answers[q.id]?.trim()), [answers]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (missingRequired || !consent) { setError("Responda os campos obrigatórios e confirme a autorização para continuar."); return; }
    setSaving(true); setError(null);
    const response = await fetch("/api/paciente/pre-consulta", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ formId: initialForm.id, consent: true, answers }) });
    if (!response.ok) setError("Não foi possível salvar agora. Tente novamente em alguns instantes.");
    else setSaved(true);
    setSaving(false);
  }

  async function logout() { const supabase = createClient(); await supabase.auth.signOut(); window.location.href = "/paciente/login"; }

  return (
    <form onSubmit={submit} className="space-y-5">
      <section className="rounded-2xl border border-border bg-surface p-6 shadow-card sm:p-8">
        <div className="flex items-start justify-between gap-4"><div><p className="eyebrow">Questionário de pré-anamnese</p><h1 className="mt-2 text-3xl font-black text-ink">Formulário de pré-consulta</h1></div><button type="button" onClick={logout} className="rounded-lg p-2 text-muted hover:bg-bg-alt" aria-label="Sair"><LogOut className="size-5" /></button></div>
        <p className="mt-4 leading-7 text-muted">Este formulário vai me ajudar a entender sua rotina, dificuldades e objetivos para construir uma estratégia realmente individualizada. Não existe resposta certa ou errada: quanto mais sincero(a) você for, melhor conseguiremos adaptar o atendimento à sua vida.</p>
        {saved && <div className="mt-5 flex items-center gap-2 rounded-xl bg-brand-light p-4 text-sm font-bold text-brand-dark"><CheckCircle2 className="size-5" /> Formulário respondido e salvo no seu perfil.</div>}
      </section>

      {manualAvailable && (
        <section className="overflow-hidden rounded-2xl border border-brand/30 bg-ink-deep p-6 text-white shadow-dark sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-brand text-ink-deep"><BookOpenText className="size-6" /></span>
              <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-brand">Prepare-se para o atendimento</p><h2 className="mt-1 text-xl font-black">Manual para a primeira consulta</h2><p className="mt-2 max-w-xl text-sm leading-6 text-white/70">Leia antes da consulta para aproveitar melhor nosso encontro. O material ficará disponível aqui até o horário agendado.</p></div>
            </div>
            <a href="/api/paciente/manual-primeira-consulta" target="_blank" rel="noreferrer" className="flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-brand px-5 text-sm font-bold text-ink-deep transition hover:bg-white"><Download className="size-4" /> Abrir manual</a>
          </div>
        </section>
      )}

      <section className="grid gap-4 rounded-2xl border border-border bg-surface p-6 shadow-card sm:grid-cols-2 sm:p-8">
        {[['Nome', patient.nome], ['E-mail', patient.email], ['CPF', patient.cpf], ['Data de nascimento', patient.data_nascimento ? new Date(`${patient.data_nascimento}T12:00:00`).toLocaleDateString('pt-BR') : 'Não informada']].map(([label, value]) => <div key={label}><p className="text-xs font-bold uppercase tracking-wider text-muted">{label}</p><p className="mt-1 font-semibold text-ink">{value || 'Não informado'}</p></div>)}
      </section>

      {questions.map((question, index) => (
        <section key={question.id} className="rounded-2xl border border-border bg-surface p-6 shadow-card sm:p-8">
          <label className="block text-base font-bold leading-6 text-ink"><span className="mr-2 text-brand-dark">{String(index + 1).padStart(2, '0')}.</span>{question.label}{question.required && <span className="ml-1 text-danger">*</span>}</label>
          {question.type === "choice" ? <div className="mt-4 grid gap-2 sm:grid-cols-2">{question.options?.map(option => <label key={option} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm transition ${answers[question.id] === option ? 'border-brand bg-brand-light text-ink' : 'border-border hover:border-brand'}`}><input type="radio" name={question.id} value={option} checked={answers[question.id] === option} onChange={() => setAnswers({ ...answers, [question.id]: option })} className="accent-brand-dark" />{option}</label>)}</div> : <textarea rows={3} value={answers[question.id] || ""} onChange={(e) => setAnswers({ ...answers, [question.id]: e.target.value })} className="mt-4 w-full resize-y rounded-xl border border-border bg-white p-4 text-ink outline-none transition focus:border-brand focus:ring-4 focus:ring-brand-light" placeholder="Digite sua resposta" />}
        </section>
      ))}

      <section className="rounded-2xl border border-border bg-surface p-6 shadow-card sm:p-8">
        <label className="flex cursor-pointer items-start gap-3"><input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1 size-4 accent-brand-dark" /><span className="text-sm leading-6 text-muted"><strong className="text-ink">Autorizo o uso destas informações de saúde para meu atendimento nutricional.</strong> Os dados serão acessados somente pelo paciente e pela equipe responsável pelo acompanhamento.</span></label>
        {error && <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-semibold text-danger">{error}</p>}
        <button disabled={saving} className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand px-5 font-bold text-ink-deep shadow-brand transition hover:bg-brand-dark disabled:opacity-60"><Save className="size-5" />{saving ? "Salvando..." : saved ? "Atualizar respostas" : "Enviar formulário"}</button>
        <p className="mt-4 flex items-center justify-center gap-2 text-xs text-muted"><ShieldCheck className="size-4 text-brand-dark" /> Ambiente seguro e vinculado ao seu perfil.</p>
      </section>
    </form>
  );
}
