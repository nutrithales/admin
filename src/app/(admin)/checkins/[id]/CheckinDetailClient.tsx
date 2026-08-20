"use client";

import { useMemo, useState, useTransition } from "react";
import { BrainCircuit, Check, CheckCircle2, Clipboard, ExternalLink, MessageCircle, RefreshCw, Save } from "lucide-react";
import { gerarPanoramaIaAction, marcarEnviadoWhatsAppAction, salvarRespostaClinicaAction } from "@/services/checkins.actions";

function pretty(value: unknown) {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Sim" : "Não";
  return String(value);
}

export function CheckinDetailClient({ checkin, paciente, historico, chatgptUrl }: any) {
  const [analise, setAnalise] = useState(checkin.analise_ia ?? "");
  const [orientacoes, setOrientacoes] = useState(checkin.orientacoes_ia ?? "");
  const [mensagem, setMensagem] = useState(checkin.mensagem_paciente ?? "");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [pending, startTransition] = useTransition();

  const respostas = checkin.respostas && typeof checkin.respostas === "object" ? checkin.respostas : {};
  const promptChatGPT = useMemo(() => {
    const linhas = Object.entries(respostas).map(([chave, valor]) => `- ${chave}: ${pretty(valor)}`).join("\n");
    const hist = (historico ?? []).map((h: any) => `${h.semana ?? "sem data"}: score ${h.pontuacao ?? "—"}% | ${h.resumo ?? ""}`).join("\n");
    return `ANÁLISE DE CHECK-IN NUTRICIONAL\n\nPaciente: ${paciente?.nome ?? "Paciente"}\nObjetivo: ${paciente?.objetivo ?? "não informado"}\nPlano: ${paciente?.plano ?? "não informado"}\nData do check-in: ${checkin.semana ?? "não informada"}\nScore: ${checkin.pontuacao ?? "—"}%\n\nRESPOSTAS DO CHECK-IN\n${linhas || checkin.resumo || "Sem respostas estruturadas"}\n\nHISTÓRICO RECENTE\n${hist || "Sem histórico anterior"}\n\nQuero que você:\n1. resuma como o paciente está indo;\n2. identifique pontos positivos e pontos de atenção;\n3. compare com os check-ins anteriores quando houver;\n4. proponha orientações práticas para os próximos 15 dias, sem prescrever medicamentos e sem inventar dados;\n5. escreva ao final uma mensagem de WhatsApp pronta para eu enviar ao paciente, em tom profissional, acolhedor, direto e sem terrorismo nutricional.`;
  }, [respostas, paciente, checkin, historico]);

  async function copiarEAbrirChatGPT() {
    await navigator.clipboard.writeText(promptChatGPT);
    setCopiado(true);
    window.open(chatgptUrl || "https://chatgpt.com/", "_blank", "noopener,noreferrer");
    window.setTimeout(() => setCopiado(false), 2500);
  }

  function salvar() {
    setFeedback(null);
    startTransition(async () => {
      const result = await salvarRespostaClinicaAction(Number(checkin.id), mensagem, analise, orientacoes);
      setFeedback(result.message);
    });
  }

  function gerarIa() {
    setFeedback(null);
    startTransition(async () => {
      const result = await gerarPanoramaIaAction(Number(checkin.id));
      setFeedback(result.message);
      if (result.success) window.location.reload();
    });
  }

  function abrirWhatsApp() {
    if (!paciente?.telefone) {
      setFeedback("Este paciente não possui telefone cadastrado.");
      return;
    }
    if (!mensagem.trim()) {
      setFeedback("Salve ou cole primeiro uma mensagem para o paciente.");
      return;
    }
    const phone = String(paciente.telefone).replace(/\D/g, "");
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(mensagem.trim())}`;
    window.open(url, "_blank", "noopener,noreferrer");
    setFeedback("WhatsApp aberto. Depois de enviar a mensagem, marque o retorno como enviado para concluir este check-in.");
  }

  function concluirRetorno() {
    setFeedback(null);
    startTransition(async () => {
      const result = await marcarEnviadoWhatsAppAction(Number(checkin.id));
      setFeedback(result.message);
      if (result.success) window.location.href = "/checkins";
    });
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-3xl border border-border bg-surface p-5 shadow-sm lg:col-span-2">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand">1 · Analisar no Assistente Check-in</p>
              <h2 className="mt-1 text-xl font-bold">Respostas completas</h2>
            </div>
            <button onClick={copiarEAbrirChatGPT} className="inline-flex items-center gap-2 rounded-xl bg-foreground px-4 py-2.5 text-sm font-semibold text-background">
              {copiado ? <Check size={17} /> : <Clipboard size={17} />}
              {copiado ? "Copiado" : "Copiar + abrir meu GPT"}
              <ExternalLink size={14} />
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {Object.entries(respostas).length ? Object.entries(respostas).map(([chave, valor]) => (
              <div key={chave} className="rounded-2xl bg-background p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">{chave.replaceAll("_", " ")}</p>
                <p className="mt-1 font-medium">{pretty(valor)}</p>
              </div>
            )) : <p className="text-sm text-muted">{checkin.resumo || "Sem respostas estruturadas."}</p>}
          </div>
        </div>

        <div className="rounded-3xl border border-border bg-surface p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand">Resumo atual</p>
          <div className="mt-4 text-center">
            <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-brand/10 text-2xl font-black text-brand">{checkin.pontuacao ?? "—"}%</div>
            <p className="mt-3 font-semibold">Score do check-in</p>
            <p className="mt-1 text-xs text-muted">{checkin.semana ? new Date(`${checkin.semana}T12:00:00`).toLocaleDateString("pt-BR") : "Sem data"}</p>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-border bg-surface p-5 shadow-sm sm:p-6">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand">2 · Síntese clínica e próximos 15 dias</p>
            <h2 className="mt-1 text-xl font-bold">Área de análise</h2>
            <p className="mt-1 text-sm text-muted">Cole aqui a resposta do seu GPT. A IA interna do painel fica disponível apenas como alternativa.</p>
          </div>
          <button onClick={gerarIa} disabled={pending} className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-semibold disabled:opacity-50">
            <RefreshCw size={16} className={pending ? "animate-spin" : ""} /> Gerar alternativa com IA do painel
          </button>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <label className="space-y-2 text-sm font-semibold">Panorama / análise
            <textarea value={analise} onChange={(e) => setAnalise(e.target.value)} rows={10} className="w-full rounded-2xl border border-border bg-background p-4 font-normal leading-6 outline-none focus:border-brand" placeholder="Cole aqui a análise do seu GPT..." />
          </label>
          <label className="space-y-2 text-sm font-semibold">Orientações para os próximos 15 dias
            <textarea value={orientacoes} onChange={(e) => setOrientacoes(e.target.value)} rows={10} className="w-full rounded-2xl border border-border bg-background p-4 font-normal leading-6 outline-none focus:border-brand" placeholder="Metas e orientações práticas..." />
          </label>
        </div>

        <label className="mt-4 block space-y-2 text-sm font-semibold">Mensagem pronta para o paciente
          <textarea value={mensagem} onChange={(e) => setMensagem(e.target.value)} rows={7} className="w-full rounded-2xl border border-border bg-background p-4 font-normal leading-6 outline-none focus:border-brand" placeholder="Mensagem que será aberta no WhatsApp..." />
        </label>

        <div className="mt-4 flex flex-wrap gap-3">
          <button onClick={salvar} disabled={pending} className="inline-flex items-center gap-2 rounded-xl bg-foreground px-4 py-2.5 text-sm font-semibold text-background disabled:opacity-50"><Save size={16} /> Salvar análise</button>
          <button onClick={abrirWhatsApp} className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white"><MessageCircle size={17} /> Abrir WhatsApp do paciente</button>
          {!checkin.revisado && <button onClick={concluirRetorno} disabled={pending} className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-800 disabled:opacity-50"><CheckCircle2 size={17} /> Marcar retorno como enviado</button>}
        </div>
        {feedback && <p className="mt-3 rounded-xl bg-background px-4 py-3 text-sm text-muted">{feedback}</p>}
      </section>

      <section className="rounded-3xl border border-border bg-surface p-5 shadow-sm sm:p-6">
        <div className="mb-5 flex items-center gap-3"><BrainCircuit size={20} className="text-brand" /><div><h2 className="font-bold">Panorama do acompanhamento</h2><p className="text-sm text-muted">Histórico recente para observar tendência, aderência e evolução.</p></div></div>
        <div className="space-y-3">
          {(historico ?? []).map((h: any) => (
            <div key={h.id} className={`rounded-2xl border p-4 ${h.id === checkin.id ? "border-brand bg-brand/5" : "border-border bg-background"}`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div><p className="font-semibold">{h.semana ? new Date(`${h.semana}T12:00:00`).toLocaleDateString("pt-BR") : "Sem data"}</p><p className="text-xs text-muted">{h.id === checkin.id ? "Check-in atual" : "Check-in anterior"}</p></div>
                <span className="rounded-full bg-surface px-3 py-1 text-sm font-bold">{h.pontuacao ?? "—"}%</span>
              </div>
              <p className="mt-3 text-sm leading-6 text-muted">{h.analise_ia || h.resumo || "Sem análise registrada."}</p>
              {h.orientacoes_ia && <div className="mt-3 rounded-xl bg-surface p-3 text-sm leading-6"><strong>Próximos passos:</strong> {h.orientacoes_ia}</div>}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
