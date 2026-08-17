"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Utensils, RefreshCw } from "lucide-react";
import type { PacientePlanoDashboard } from "@/services/paciente-plano.queries";

function formatarQuantidade(g?: number, texto?: string) {
  if (texto) return texto;
  if (g == null) return null;
  return `${Math.round(g)} g`;
}

export function PlanoAlimentarPacienteClient({ plano }: { plano: PacientePlanoDashboard }) {
  const [opcaoPorRefeicao, setOpcaoPorRefeicao] = useState<Record<string, number>>({});
  const [subAberta, setSubAberta] = useState<Record<string, boolean>>({});

  const substituicoesPorItem = useMemo(() => {
    const mapa = new Map<string, typeof plano.substituicoes>();
    for (const sub of plano.substituicoes) {
      mapa.set(sub.itemId, [...(mapa.get(sub.itemId) ?? []), sub]);
    }
    return mapa;
  }, [plano.substituicoes]);

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] bg-ink-deep p-5 text-white shadow-dark sm:p-7">
        <div className="flex items-start gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-brand text-ink-deep">
            <Utensils className="size-5" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand">Seu plano alimentar</p>
            <h1 className="mt-1 text-2xl font-black leading-tight sm:text-3xl">{plano.titulo}</h1>
            <p className="mt-2 text-sm text-white/65">{plano.protocoloNome ?? "Plano individualizado"}</p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {plano.metas.kcal != null && <Resumo label="Energia" value={`${Math.round(plano.metas.kcal)} kcal`} />}
          {plano.metas.proteinaG != null && <Resumo label="Proteína" value={`${Math.round(plano.metas.proteinaG)} g`} />}
          {plano.metas.carboidratoG != null && <Resumo label="Carboidrato" value={`${Math.round(plano.metas.carboidratoG)} g`} />}
          {plano.metas.gorduraG != null && <Resumo label="Gordura" value={`${Math.round(plano.metas.gorduraG)} g`} />}
        </div>
      </section>

      {plano.refeicoes.map((refeicao) => {
        const opcaoAtiva = opcaoPorRefeicao[refeicao.id] ?? refeicao.opcoes[0]?.numero ?? 1;
        const opcao = refeicao.opcoes.find((item) => item.numero === opcaoAtiva) ?? refeicao.opcoes[0];
        if (!opcao) return null;

        return (
          <section key={refeicao.id} className="overflow-hidden rounded-[24px] border border-border bg-surface shadow-card">
            <div className="border-b border-border px-4 py-4 sm:px-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand-dark">Refeição</p>
                  <h2 className="mt-1 text-xl font-black text-ink">{refeicao.nome}</h2>
                </div>
                {refeicao.opcoes.length > 1 && <span className="rounded-full bg-brand-light px-3 py-1 text-xs font-bold text-brand-dark">{refeicao.opcoes.length} opções</span>}
              </div>

              {refeicao.opcoes.length > 1 && (
                <div className="mt-4 flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
                  {refeicao.opcoes.map((item) => (
                    <button
                      key={item.numero}
                      onClick={() => setOpcaoPorRefeicao((prev) => ({ ...prev, [refeicao.id]: item.numero }))}
                      className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold transition ${item.numero === opcaoAtiva ? "bg-ink-deep text-white" : "bg-bg-alt text-muted hover:text-ink"}`}
                    >
                      Opção {item.numero}{item.nome ? `: ${item.nome}` : ""}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-3 p-4 sm:p-5">
              {opcao.itens.map((item) => {
                const subs = substituicoesPorItem.get(item.id) ?? [];
                const aberta = subAberta[item.id] ?? false;
                return (
                  <div key={item.id} className="rounded-2xl bg-bg-alt-2 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-bold text-ink">{item.nome}</p>
                        {formatarQuantidade(item.quantidadeG, item.quantidadeTexto) && (
                          <p className="mt-1 text-sm font-semibold text-brand-dark">{formatarQuantidade(item.quantidadeG, item.quantidadeTexto)}</p>
                        )}
                        {item.ingredientes && item.ingredientes.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {item.ingredientes.map((ing, index) => (
                              <p key={`${ing.nome}-${index}`} className="text-sm text-muted">{ing.nome}: {Math.round(ing.quantidadeG)} g</p>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {subs.length > 0 && (
                      <div className="mt-3 border-t border-border pt-3">
                        <button
                          onClick={() => setSubAberta((prev) => ({ ...prev, [item.id]: !aberta }))}
                          className="flex w-full items-center justify-between gap-2 text-left text-sm font-bold text-ink"
                        >
                          <span className="flex items-center gap-2"><RefreshCw className="size-4 text-brand-dark" /> Ver substituições</span>
                          {aberta ? <ChevronUp className="size-4 text-muted" /> : <ChevronDown className="size-4 text-muted" />}
                        </button>
                        {aberta && (
                          <div className="mt-3 space-y-2">
                            {subs.map((sub, index) => (
                              <div key={`${sub.nome}-${index}`} className="flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2.5 text-sm">
                                <span className="font-semibold text-ink">{sub.nome}</span>
                                <span className="shrink-0 font-bold text-brand-dark">{Math.round(sub.quantidadeG)} g</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {refeicao.observacoes && (
                <div className="rounded-2xl border-l-4 border-brand bg-brand-light p-4 text-sm leading-6 text-ink">
                  {refeicao.observacoes}
                </div>
              )}
            </div>
          </section>
        );
      })}

      {plano.observacoes && (
        <section className="rounded-[24px] border border-border bg-surface p-5 shadow-card">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand-dark">Orientações</p>
          <p className="mt-3 whitespace-pre-line text-sm leading-6 text-ink">{plano.observacoes}</p>
        </section>
      )}
    </div>
  );
}

function Resumo({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/8 px-3 py-3">
      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-white/50">{label}</p>
      <p className="mt-1 text-base font-black text-white">{value}</p>
    </div>
  );
}
