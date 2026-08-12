"use client";

import { useMemo, useState, useTransition } from "react";
import { ClipboardCheck, Link2, MessageCircle, Send, Smartphone } from "lucide-react";
import { criarEnvioFormularioAction } from "@/services/formularios.actions";
import type { EnvioFormularioResumo, FormularioResumo } from "@/services/formularios.queries";

interface PacienteResumo {
  id: string;
  nome: string | null;
  status: string | null;
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    agendado: "Agendado",
    enviado: "Enviado",
    visualizado: "Visualizado",
    respondido: "Respondido",
    expirado: "Expirado",
    erro: "Erro",
    cancelado: "Cancelado",
  };
  return labels[status] ?? status;
}

function statusClass(status: string) {
  if (status === "respondido") return "bg-emerald-50 text-emerald-700";
  if (status === "erro" || status === "expirado") return "bg-red-50 text-red-700";
  if (status === "visualizado") return "bg-blue-50 text-blue-700";
  return "bg-black/5 text-black/60";
}

export function FormulariosClient({
  formularios,
  pacientes,
  envios,
}: {
  formularios: FormularioResumo[];
  pacientes: PacienteResumo[];
  envios: EnvioFormularioResumo[];
}) {
  const [formularioId, setFormularioId] = useState(formularios[0]?.id ?? "");
  const [pacienteId, setPacienteId] = useState("");
  const [enviarWhatsapp, setEnviarWhatsapp] = useState(true);
  const [resultado, setResultado] = useState<{ success: boolean; message: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const formularioSelecionado = useMemo(
    () => formularios.find((f) => f.id === formularioId),
    [formularios, formularioId],
  );

  function enviar() {
    const data = new FormData();
    data.set("formulario_id", formularioId);
    data.set("paciente_id", pacienteId);
    if (enviarWhatsapp) data.set("enviar_whatsapp", "on");

    setResultado(null);
    startTransition(async () => {
      const response = await criarEnvioFormularioAction(data);
      setResultado(response);
    });
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-3xl border border-border bg-surface p-5 shadow-sm sm:p-6">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand">Novo envio</p>
              <h2 className="mt-1 text-xl font-bold">Enviar formulário ao paciente</h2>
              <p className="mt-1 text-sm text-muted">Crie um link individual. Com a integração ativa, o sistema dispara esse link pelo WhatsApp.</p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand/10 text-brand">
              <Send size={20} />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2 text-sm font-semibold">
              Formulário
              <select value={formularioId} onChange={(e) => setFormularioId(e.target.value)} className="w-full rounded-xl border border-border bg-background px-3 py-3 font-normal outline-none focus:border-brand">
                {formularios.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
              </select>
            </label>
            <label className="space-y-2 text-sm font-semibold">
              Paciente
              <select value={pacienteId} onChange={(e) => setPacienteId(e.target.value)} className="w-full rounded-xl border border-border bg-background px-3 py-3 font-normal outline-none focus:border-brand">
                <option value="">Selecione...</option>
                {pacientes.filter((p) => p.status !== "inativo").map((p) => <option key={p.id} value={p.id}>{p.nome ?? "Paciente sem nome"}</option>)}
              </select>
            </label>
          </div>

          <label className="mt-4 flex cursor-pointer items-center gap-3 rounded-2xl border border-border bg-background p-4">
            <input type="checkbox" checked={enviarWhatsapp} onChange={(e) => setEnviarWhatsapp(e.target.checked)} className="h-4 w-4 accent-[var(--color-brand)]" />
            <span className="flex-1">
              <span className="flex items-center gap-2 font-semibold"><MessageCircle size={17} /> Enviar pelo WhatsApp</span>
              <span className="mt-0.5 block text-xs font-normal text-muted">Se desmarcado, o sistema apenas gera o link individual.</span>
            </span>
          </label>

          {formularioSelecionado && (
            <div className="mt-4 rounded-2xl bg-background p-4 text-sm text-muted">
              <span className="font-semibold text-foreground">{formularioSelecionado.perguntas?.length ?? 0} perguntas</span>
              {formularioSelecionado.recorrencia_dias ? ` · recorrência sugerida a cada ${formularioSelecionado.recorrencia_dias} dias` : ""}
            </div>
          )}

          <button onClick={enviar} disabled={!formularioId || !pacienteId || isPending} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-foreground px-4 py-3 font-semibold text-background transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40">
            <Smartphone size={18} /> {isPending ? "Preparando envio..." : enviarWhatsapp ? "Enviar agora" : "Gerar link"}
          </button>

          {resultado && (
            <div className={`mt-4 rounded-2xl px-4 py-3 text-sm ${resultado.success ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-800"}`}>
              {resultado.message}
            </div>
          )}
        </div>

        <div className="rounded-3xl border border-border bg-surface p-5 shadow-sm sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand">Modelos</p>
          <h2 className="mt-1 text-xl font-bold">Formulários disponíveis</h2>
          <div className="mt-5 space-y-3">
            {formularios.map((f) => (
              <div key={f.id} className="rounded-2xl border border-border bg-background p-4">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl bg-brand/10 text-brand"><ClipboardCheck size={17} /></div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">{f.nome}</p>
                      {f.tipo === "checkin" && <span className="rounded-full bg-brand/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand">Check-in</span>}
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted">{f.descricao || "Sem descrição"}</p>
                    <p className="mt-2 text-xs font-semibold text-muted">{f.perguntas?.length ?? 0} perguntas</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-border bg-surface p-5 shadow-sm sm:p-6">
        <div className="mb-5 flex items-center gap-3">
          <Link2 className="text-brand" size={20} />
          <div>
            <h2 className="font-bold">Últimos envios</h2>
            <p className="text-sm text-muted">Acompanhe se o paciente recebeu, abriu ou respondeu.</p>
          </div>
        </div>

        {envios.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border py-10 text-center text-sm text-muted">Nenhum formulário enviado ainda.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="border-b border-border text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-3 py-3">Paciente</th>
                  <th className="px-3 py-3">Formulário</th>
                  <th className="px-3 py-3">Canal</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3">Criado</th>
                  <th className="px-3 py-3">Erro</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {envios.map((envio) => (
                  <tr key={envio.id}>
                    <td className="px-3 py-4 font-semibold">{envio.paciente?.nome ?? "—"}</td>
                    <td className="px-3 py-4">{envio.formulario?.nome ?? "—"}</td>
                    <td className="px-3 py-4 capitalize">{envio.canal}</td>
                    <td className="px-3 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(envio.status)}`}>{statusLabel(envio.status)}</span></td>
                    <td className="px-3 py-4 text-muted">{new Date(envio.agendado_para).toLocaleString("pt-BR")}</td>
                    <td className="max-w-xs px-3 py-4 text-xs text-red-700">{envio.ultimo_erro ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
