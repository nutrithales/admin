"use client";
import { useState } from "react";
import type { CalendarStatus } from "@/services/running-calendar";
import { createRunningCalendar, revokeRunningCalendar } from "@/services/running-calendar.actions";

const when = (date: string) => new Date(date).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
export default function CalendarConnection({ initial }: { initial: CalendarStatus }) {
  const [status, setStatus] = useState(initial);
  const [consent, setConsent] = useState(false);
  const [rotate, setRotate] = useState(false);
  const [busy, setBusy] = useState(false);
  const [url, setUrl] = useState("");
  const [message, setMessage] = useState("");
  async function generate() {
    setBusy(true); setMessage("");
    try {
      const result = await createRunningCalendar({ consent, rotate });
      if (result.success) { setUrl(result.url); setStatus({ active: true, expires: result.expires, lastFetched: null }); setRotate(false); setMessage("Link gerado. Copie e adicione ao Intervals.icu seguindo o passo a passo abaixo."); }
      else setMessage(result.message);
    } catch { setMessage("Falha de conexão. Tente novamente."); }
    finally { setBusy(false); }
  }
  async function revoke() {
    setBusy(true); setMessage("");
    try {
      const result = await revokeRunningCalendar();
      if (result.success) { setUrl(""); setStatus({ active: false, expires: null, lastFetched: null }); setMessage("Link desativado. Remova também o calendário no Intervals.icu para retirar os treinos já copiados."); }
      else setMessage(result.message);
    } catch { setMessage("Não foi possível desativar. Tente novamente."); }
    finally { setBusy(false); }
  }
  async function copy() {
    try { await navigator.clipboard.writeText(url); setMessage("Link copiado."); }
    catch { setMessage("Selecione e copie o link no campo acima."); }
  }
  return <section className="rounded-3xl border border-border bg-white p-5">
    <h2 className="text-xl font-bold">Seu calendário privado</h2>
    <p className="mt-2 font-bold text-brand-dark">{status.active ? "Link ativo — aguardando configuração ou sincronização externa" : "Envio ainda não configurado"}</p>
    {status.active && <p className="mt-2 text-sm leading-6">Validade: {status.expires ? when(status.expires) : "—"}. {status.lastFetched ? `Última consulta ao link: ${when(status.lastFetched)}.` : "Nenhuma consulta ao link registrada."} Uma consulta ao link não confirma que o Garmin recebeu o treino.</p>}
    <p className="mt-3 text-sm leading-6">O link compartilha as datas, blocos, instruções e paces dos seus treinos liberados. Ele não inclui seu nome, e-mail, medidas, feedbacks ou registros pessoais. Quem tiver o link poderá ler esse calendário; compartilhe apenas com o Intervals.icu.</p>
    {!url && <p className="mt-2 text-xs leading-5 text-muted">O endereço aparece apenas ao gerar. Depois de adicionado ao Intervals.icu, não é preciso gerar novamente.</p>}
    <label className="mt-4 flex min-h-12 items-start gap-3 text-sm leading-6"><input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} disabled={busy} className="mt-1 size-5 shrink-0" />Quero compartilhar meu calendário de corrida com o Intervals.icu para encaminhar os treinos ao Garmin.</label>
    {status.active && <label className="mt-2 flex min-h-12 items-start gap-3 text-sm leading-6"><input type="checkbox" checked={rotate} onChange={e => setRotate(e.target.checked)} disabled={busy} className="mt-1 size-5 shrink-0" />Quero substituir o link atual. O anterior deixará de funcionar e precisarei trocar a assinatura no Intervals.icu.</label>}
    <button type="button" disabled={busy || !consent || (status.active && !rotate)} onClick={() => void generate()} className="mt-3 min-h-12 w-full rounded-xl bg-brand px-4 py-3 font-bold text-ink-deep disabled:opacity-40">{busy ? "Aguarde…" : status.active ? "Substituir link privado" : "Gerar link privado"}</button>
    {!!url && <div className="mt-5 rounded-2xl bg-brand-light p-4"><label className="text-sm font-bold">Link para adicionar ao Intervals.icu<input aria-label="Link privado do calendário" type="text" readOnly value={url} onFocus={e => e.currentTarget.select()} className="mt-2 min-h-12 w-full rounded-xl border border-border bg-white p-3 text-sm" /></label><button type="button" onClick={() => void copy()} className="mt-3 min-h-12 w-full rounded-xl bg-ink-deep px-4 font-bold text-white">Copiar link</button></div>}
    {status.active && <button type="button" disabled={busy} onClick={() => void revoke()} className="mt-4 min-h-11 rounded-xl border border-border px-4 text-sm font-bold">Desativar link</button>}
    {message && <p role="status" className="mt-4 rounded-xl bg-bg-alt p-3 text-sm leading-6">{message}</p>}
  </section>;
}
