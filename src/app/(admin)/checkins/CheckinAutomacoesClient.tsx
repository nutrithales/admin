"use client";

import { useMemo, useState, useTransition } from "react";
import { CalendarClock, Pause, Play, Trash2, Users } from "lucide-react";
import { alternarCheckinAutomacaoAction, criarCheckinAutomacaoAction, excluirCheckinAutomacaoAction } from "@/services/checkin-automacoes.actions";
import type { CheckinAutomacao } from "@/services/checkin-automacoes.queries";
import type { FormularioResumo } from "@/services/formularios.queries";

type Paciente = { id: string; nome: string | null; status: string | null };

function publicoLabel(value: CheckinAutomacao["publico"], selected: number) {
  if (value === "ativos") return "Somente pacientes ativos";
  if (value === "todos") return "Todos os pacientes";
  return `${selected} paciente${selected === 1 ? "" : "s"} selecionado${selected === 1 ? "" : "s"}`;
}

export function CheckinAutomacoesClient({ formularios, pacientes, automacoes }: { formularios: FormularioResumo[]; pacientes: Paciente[]; automacoes: CheckinAutomacao[] }) {
  const checkins = useMemo(() => formularios.filter((f) => f.tipo === "checkin" && f.ativo), [formularios]);
  const [formularioId, setFormularioId] = useState(checkins[0]?.id ?? "");
  const formulario = checkins.find((f) => f.id === formularioId);
  const [publico, setPublico] = useState<"ativos" | "todos" | "selecionados">("ativos");
  const [selecionados, setSelecionados] = useState<string[]>([]);
  const [busca, setBusca] = useState("");
  const [resultado, setResultado] = useState<{ success: boolean; message: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  const filtrados = pacientes.filter((p) => (p.nome ?? "").toLowerCase().includes(busca.toLowerCase()));

  function criar(form: HTMLFormElement) {
    const data = new FormData(form);
    data.set("formulario_id", formularioId);
    data.set("publico", publico);
    selecionados.forEach((id) => data.append("paciente_ids", id));
    setResultado(null);
    startTransition(async () => setResultado(await criarCheckinAutomacaoAction(data)));
  }

  function toggle(id: string, ativo: boolean) {
    startTransition(async () => setResultado(await alternarCheckinAutomacaoAction(id, ativo)));
  }

  function remove(id: string) {
    if (!window.confirm("Excluir esta automação? Os envios já realizados serão preservados.")) return;
    startTransition(async () => setResultado(await excluirCheckinAutomacaoAction(id)));
  }

  return (
    <section className="mb-6 rounded-3xl border border-border bg-surface p-5 shadow-sm sm:p-6">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand">Disparo automático</p>
          <h2 className="mt-1 text-xl font-bold">Agenda de check-ins pelo WhatsApp</h2>
          <p className="mt-1 text-sm text-muted">Defina a primeira data, a recorrência e o público. A lista de pacientes é recalculada em cada disparo.</p>
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand/10 text-brand"><CalendarClock size={20} /></div>
      </div>

      <form className="grid gap-4 lg:grid-cols-2" onSubmit={(e) => { e.preventDefault(); criar(e.currentTarget); }}>
        <label className="space-y-2 text-sm font-semibold">Nome da automação
          <input name="nome" defaultValue="Check-in quinzenal" required className="w-full rounded-xl border border-border bg-background px-3 py-3 font-normal outline-none focus:border-brand" />
        </label>
        <label className="space-y-2 text-sm font-semibold">Formulário
          <select value={formularioId} onChange={(e) => setFormularioId(e.target.value)} className="w-full rounded-xl border border-border bg-background px-3 py-3 font-normal outline-none focus:border-brand">
            {checkins.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
          </select>
        </label>
        <label className="space-y-2 text-sm font-semibold">Primeiro disparo
          <span className="flex w-full min-w-0 rounded-xl border border-border bg-background px-3 py-3">
            <input name="primeira_execucao_em" type="datetime-local" required className="block w-full min-w-0 border-0 bg-transparent p-0 font-normal outline-none" />
          </span>
        </label>
        <label className="space-y-2 text-sm font-semibold">Repetir a cada
          <div className="flex items-center gap-2">
            <input name="recorrencia_dias" type="number" min={1} max={365} defaultValue={formulario?.recorrencia_dias ?? 15} required className="w-full rounded-xl border border-border bg-background px-3 py-3 font-normal outline-none focus:border-brand" />
            <span className="text-sm text-muted">dias</span>
          </div>
        </label>

        <div className="lg:col-span-2">
          <p className="mb-2 text-sm font-semibold">Quem recebe</p>
          <div className="grid gap-2 sm:grid-cols-3">
            {[
              ["ativos", "Somente ativos", "Recomendado para o acompanhamento recorrente"],
              ["todos", "Todos", "Inclui pacientes ativos e inativos"],
              ["selecionados", "Selecionar pacientes", "Escolha manualmente quem participa"],
            ].map(([value, label, help]) => (
              <label key={value} className={`cursor-pointer rounded-2xl border p-4 ${publico === value ? "border-brand bg-brand/5" : "border-border bg-background"}`}>
                <input type="radio" name="publico_visual" value={value} checked={publico === value} onChange={() => setPublico(value as typeof publico)} className="mr-2 accent-[var(--color-brand)]" />
                <span className="font-semibold">{label}</span>
                <span className="mt-1 block text-xs leading-5 text-muted">{help}</span>
              </label>
            ))}
          </div>
        </div>

        {publico === "selecionados" && (
          <div className="lg:col-span-2 rounded-2xl border border-border bg-background p-4">
            <div className="mb-3 flex items-center gap-2"><Users size={17} className="text-brand" /><p className="text-sm font-semibold">Selecionar pacientes</p></div>
            <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Pesquisar paciente..." className="mb-3 w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm outline-none focus:border-brand" />
            <div className="grid max-h-64 gap-2 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3">
              {filtrados.map((p) => (
                <label key={p.id} className="flex cursor-pointer items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2.5 text-sm">
                  <input type="checkbox" checked={selecionados.includes(p.id)} onChange={(e) => setSelecionados((old) => e.target.checked ? [...old, p.id] : old.filter((id) => id !== p.id))} className="accent-[var(--color-brand)]" />
                  <span className="min-w-0 flex-1 truncate">{p.nome ?? "Paciente sem nome"}</span>
                  <span className="text-[11px] text-muted">{p.status}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        <div className="lg:col-span-2">
          <button type="submit" disabled={!formularioId || isPending || (publico === "selecionados" && selecionados.length === 0)} className="inline-flex items-center gap-2 rounded-xl bg-foreground px-4 py-3 text-sm font-semibold text-background disabled:opacity-40">
            <CalendarClock size={17} /> {isPending ? "Salvando..." : "Criar automação"}
          </button>
          {resultado && <span className={`ml-3 text-sm ${resultado.success ? "text-emerald-700" : "text-amber-700"}`}>{resultado.message}</span>}
        </div>
      </form>

      <div className="mt-6 border-t border-border pt-5">
        <h3 className="font-bold">Automações cadastradas</h3>
        {automacoes.length === 0 ? (
          <p className="mt-3 rounded-2xl border border-dashed border-border p-5 text-sm text-muted">Nenhuma automação cadastrada ainda.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {automacoes.map((a) => (
              <div key={a.id} className="flex flex-col gap-3 rounded-2xl border border-border bg-background p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2"><p className="font-semibold">{a.nome}</p><span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${a.ativo ? "bg-emerald-50 text-emerald-700" : "bg-black/5 text-muted"}`}>{a.ativo ? "Ativa" : "Pausada"}</span></div>
                  <p className="mt-1 text-xs text-muted">{a.formulario?.nome ?? "Check-in"} · {publicoLabel(a.publico, a.paciente_ids?.length ?? 0)} · a cada {a.recorrencia_dias} dias</p>
                  <p className="mt-1 text-xs text-muted">Próximo disparo: {new Date(a.proximo_disparo_em).toLocaleString("pt-BR")}</p>
                </div>
                <div className="flex gap-2">
                  <button type="button" disabled={isPending} onClick={() => toggle(a.id, !a.ativo)} className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface px-3 py-2 text-xs font-semibold">{a.ativo ? <Pause size={14} /> : <Play size={14} />}{a.ativo ? "Pausar" : "Ativar"}</button>
                  <button type="button" disabled={isPending} onClick={() => remove(a.id)} className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface px-3 py-2 text-xs font-semibold text-red-700"><Trash2 size={14} />Excluir</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
