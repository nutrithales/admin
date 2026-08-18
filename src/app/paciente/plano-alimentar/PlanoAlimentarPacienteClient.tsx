"use client";

import { useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Utensils,
  RefreshCw,
  Lightbulb,
  ListChecks,
  Home,
  ClipboardList,
  Info,
  Leaf,
  Droplets,
  LayoutDashboard,
} from "lucide-react";
import type { PacientePlanoDashboard } from "@/services/paciente-plano.queries";

function formatarQuantidade(g?: number, texto?: string) {
  if (texto) return texto;
  if (g == null) return null;
  return `${Math.round(g)} g`;
}

function dicaDaOpcao(refeicao: string, nomeOpcao?: string | null) {
  const nome = (nomeOpcao ?? "").toLowerCase();
  const slot = refeicao.toLowerCase();
  if (nome.includes("pão com ovos")) return "Prepare os ovos mexidos, cozidos ou em omelete. Se a manhã for corrida, deixe-os prontos na noite anterior e apenas aqueça. A fruta pode ser consumida junto ou logo depois.";
  if (nome.includes("iogurte") && nome.includes("whey")) return "Misture primeiro o whey ao iogurte até formar um creme e acrescente a fruta depois. Aveia e itens secos ficam melhores quando colocados somente na hora de consumir.";
  if (nome.includes("panqueca")) return "Amasse a banana, misture os ingredientes e prepare em frigideira antiaderente em fogo baixo. Pode ser feita na noite anterior e aquecida rapidamente no dia seguinte.";
  if (nome.includes("fruta") && nome.includes("cottage")) return "Deixe a fruta higienizada e a porção de cottage e castanhas já separadas. Para transportar, leve em potes pequenos e misture somente na hora.";
  if (nome.includes("mini sanduíche")) return "Monte o sanduíche perto do horário de consumo ou leve o recheio separado para evitar que o pão fique úmido. Se precisar deixar pronto, mantenha refrigerado e bem embalado.";
  if (nome.includes("prato com feijão")) return "Considere os pesos dos alimentos já prontos. Para facilitar a semana, deixe arroz, feijão e proteína porcionados e varie temperos e vegetais. Use o azeite depois do preparo.";
  if (nome.includes("prato sem feijão")) return "Boa opção para dias em que você quer uma refeição mais simples. Deixe carboidrato e proteína porcionados e complete com vegetais. Varie ervas, limão e especiarias.";
  if (nome.includes("sanduíche proteico") || nome.includes("sanduíche com proteína")) return "Deixe a proteína pronta e porcionada para montar rapidamente. Acrescente vegetais somente na hora e transporte recheios mais úmidos separados do pão.";
  if (nome.includes("iogurte com fruta")) return "Mantenha o iogurte refrigerado e leve a fruta inteira ou em pote separado. Aveia, granola ou sementes ficam melhores quando acrescentadas no momento de comer.";
  if (nome.includes("pão com doce de leite")) return "Opção leve e de baixo volume para antes do treino. Monte perto do horário de sair e evite acrescentar outros recheios. Ajuste o intervalo antes do exercício conforme sua tolerância.";
  if (nome.includes("banana") && nome.includes("pasta de amendoim")) return "Use uma camada fina de pasta de amendoim, respeitando a quantidade indicada. Quanto mais perto do treino, mais importante manter essa porção pequena.";
  if (nome.includes("pão") && nome.includes("pasta de amendoim")) return "Passe a pasta em camada fina e mantenha a preparação simples. Se o treino acontecer logo depois, observe seu conforto gastrointestinal.";
  if (slot.includes("pré-treino")) return "Mantenha esta opção simples e com baixo volume. Observe conforto gastrointestinal, energia e desempenho para definir o melhor intervalo antes do treino.";
  if (slot.includes("almoço") || slot.includes("jantar")) return "Organize os alimentos já prontos e porcionados. Preparar proteína e carboidrato em maior quantidade algumas vezes por semana facilita a execução sem depender de improviso.";
  return "Deixe os ingredientes principais porcionados com antecedência e escolha a forma de preparo que melhor encaixa na sua rotina. A ideia é tornar esta opção fácil de repetir no dia a dia.";
}

function slugRefeicao(id: string) { return `refeicao-${id}`; }

export function PlanoAlimentarPacienteClient({ plano }: { plano: PacientePlanoDashboard }) {
  const [opcaoPorRefeicao, setOpcaoPorRefeicao] = useState<Record<string, number>>({});
  const [subAberta, setSubAberta] = useState<Record<string, boolean>>({});
  const [vegetalAberto, setVegetalAberto] = useState<Record<string, boolean>>({});
  const [listaFinalAberta, setListaFinalAberta] = useState(false);

  const substituicoesPorItem = useMemo(() => {
    const mapa = new Map<string, typeof plano.substituicoes>();
    for (const sub of plano.substituicoes) mapa.set(sub.itemId, [...(mapa.get(sub.itemId) ?? []), sub]);
    return mapa;
  }, [plano.substituicoes]);

  const irPara = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  const irParaRefeicao = (id: string) => irPara(slugRefeicao(id));

  return (
    <div id="topo-plano" className="mx-auto max-w-3xl space-y-3.5 pb-28 sm:space-y-6 sm:pb-8">
      <section className="overflow-hidden rounded-[24px] bg-ink-deep text-white shadow-dark sm:rounded-[30px]">
        <div className="p-4 sm:p-7">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-brand text-ink-deep shadow-brand sm:size-11"><Utensils className="size-5" /></div>
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-brand sm:text-xs">Seu plano alimentar</p>
              <h1 className="mt-1 line-clamp-2 text-[22px] font-black leading-[1.05] sm:text-3xl">{plano.titulo}</h1>
              <p className="mt-1.5 text-xs font-medium text-white/60 sm:text-sm">Plano individualizado para sua rotina</p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 sm:mt-6 sm:grid-cols-4">
            {plano.metas.kcal != null && <Resumo label="Energia" value={`${Math.round(plano.metas.kcal)} kcal`} />}
            {plano.metas.proteinaG != null && <Resumo label="Proteína" value={`${Math.round(plano.metas.proteinaG)} g`} />}
            {plano.metas.carboidratoG != null && <Resumo label="Carboidrato" value={`${Math.round(plano.metas.carboidratoG)} g`} />}
            {plano.metas.gorduraG != null && <Resumo label="Gordura" value={`${Math.round(plano.metas.gorduraG)} g`} />}
          </div>
        </div>
      </section>

      <section id="refeicoes" className="scroll-mt-3 rounded-[20px] border border-border/80 bg-surface p-3 shadow-card sm:p-4">
        <div className="flex items-center justify-between gap-3 px-1">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-brand-dark sm:text-xs">Navegação rápida</p>
            <p className="mt-0.5 text-xs font-semibold text-muted">Toque para ir direto à refeição ou orientação</p>
          </div>
          <ClipboardList className="size-4 shrink-0 text-brand-dark" />
        </div>
        <div className="mobile-scroll -mx-1 mt-2.5 flex snap-x snap-mandatory gap-2 overflow-x-auto px-1 pb-1">
          {plano.refeicoes.map((refeicao, index) => (
            <button
              key={`atalho-${refeicao.id}`}
              onClick={() => irParaRefeicao(refeicao.id)}
              className="min-h-11 shrink-0 snap-start rounded-full border border-border bg-bg-alt px-3.5 py-2 text-sm font-bold text-ink transition hover:border-brand/50 hover:bg-brand-light active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            >
              <span className="mr-1.5 text-[11px] font-black text-brand-dark">{String(index + 1).padStart(2, "0")}</span>
              {refeicao.nome}
            </button>
          ))}
        </div>
      </section>

      {plano.refeicoes.map((refeicao, refeicaoIndex) => {
        const opcaoAtiva = opcaoPorRefeicao[refeicao.id] ?? refeicao.opcoes[0]?.numero ?? 1;
        const opcao = refeicao.opcoes.find((item) => item.numero === opcaoAtiva) ?? refeicao.opcoes[0];

        if (!opcao && refeicao.observacoes) {
          return (
            <section id={slugRefeicao(refeicao.id)} key={refeicao.id} className="scroll-mt-3 overflow-hidden rounded-[22px] border border-brand/30 bg-surface shadow-card sm:rounded-[26px]">
              <div className="bg-gradient-to-b from-brand-light/80 to-white px-4 py-4 sm:px-5 sm:py-5">
                <div className="flex items-center gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white text-brand-dark shadow-sm"><Droplets className="size-5" /></span>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.14em] text-brand-dark sm:text-xs">Orientação do ciclo</p>
                    <h2 className="mt-0.5 text-xl font-black leading-tight text-ink sm:text-2xl">{refeicao.nome}</h2>
                  </div>
                </div>
              </div>
              <div className="p-4 sm:p-5">
                <p className="whitespace-pre-line text-sm leading-6 text-ink">{refeicao.observacoes}</p>
              </div>
            </section>
          );
        }

        if (!opcao) return null;

        return (
          <section id={slugRefeicao(refeicao.id)} key={refeicao.id} className="scroll-mt-3 overflow-hidden rounded-[22px] border border-border/80 bg-surface shadow-card sm:rounded-[26px]">
            <div className="bg-gradient-to-b from-brand-light/70 to-white px-4 py-4 sm:px-5 sm:py-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-brand-dark sm:text-xs">Refeição {String(refeicaoIndex + 1).padStart(2, "0")}</p>
                  <h2 className="mt-0.5 text-xl font-black leading-tight text-ink sm:text-2xl">{refeicao.nome}</h2>
                </div>
                {refeicao.opcoes.length > 1 && <span className="shrink-0 rounded-full border border-brand/20 bg-white/80 px-2.5 py-1 text-[11px] font-black text-brand-dark">{refeicao.opcoes.length} opções</span>}
              </div>

              {refeicao.opcoes.length > 1 && (
                <div className="mobile-scroll -mx-1 mt-3.5 flex snap-x snap-mandatory gap-2 overflow-x-auto px-1 pb-1">
                  {refeicao.opcoes.map((item) => (
                    <button
                      key={item.numero}
                      onClick={() => setOpcaoPorRefeicao((prev) => ({ ...prev, [refeicao.id]: item.numero }))}
                      aria-pressed={item.numero === opcaoAtiva}
                      className={`min-h-12 shrink-0 snap-start rounded-2xl border px-3.5 py-2 text-left transition active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${item.numero === opcaoAtiva ? "border-ink-deep bg-ink-deep text-white shadow-dark" : "border-border bg-white text-ink hover:border-brand/40"}`}
                    >
                      <span className="block text-sm font-black">Opção {item.numero}</span>
                      {item.nome && <span className={`mt-0.5 block max-w-[210px] truncate text-[11px] font-semibold ${item.numero === opcaoAtiva ? "text-white/65" : "text-muted"}`}>{item.nome}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2.5 p-3 sm:space-y-3 sm:p-5">
              {opcao.itens.map((item) => {
                const subs = substituicoesPorItem.get(item.id) ?? [];
                const aberta = subAberta[item.id] ?? false;
                const tipoA = item.papelMacro === "livre";
                const tipoB = item.papelMacro === "vegetal_b";
                const ehVegetal = tipoA || tipoB;
                const vegetais = tipoA ? (plano.vegetais?.tipoA ?? []) : tipoB ? (plano.vegetais?.tipoB ?? []) : [];
                const vegAberto = vegetalAberto[item.id] ?? false;

                return (
                  <div key={item.id} className="rounded-[18px] border border-border/70 bg-bg-alt-2 p-3.5 sm:p-4">
                    <div className="min-w-0">
                      <p className="text-[15px] font-black leading-5 text-ink sm:text-base">{item.nome}</p>
                      {formatarQuantidade(item.quantidadeG, item.quantidadeTexto) && (
                        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className="rounded-lg bg-brand-light px-2 py-1 text-sm font-black text-brand-dark">{formatarQuantidade(item.quantidadeG, item.quantidadeTexto)}</span>
                          {item.medidaCaseira && <span className="text-xs font-bold text-muted">{item.medidaCaseira}</span>}
                        </div>
                      )}
                      {item.ingredientes && item.ingredientes.length > 0 && (
                        <div className="mt-2.5 space-y-1.5 border-l-2 border-brand/30 pl-3">
                          {item.ingredientes.map((ing, index) => (
                            <p key={`${ing.nome}-${index}`} className="text-sm leading-5 text-muted">
                              {ing.nome}: <span className="font-bold text-ink">{Math.round(ing.quantidadeG)} g</span>{ing.medidaCaseira ? ` (${ing.medidaCaseira})` : ""}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>

                    {ehVegetal && vegetais.length > 0 && (
                      <div className="mt-3 border-t border-border pt-2">
                        <button
                          onClick={() => setVegetalAberto((prev) => ({ ...prev, [item.id]: !vegAberto }))}
                          className="flex min-h-12 w-full items-center justify-between gap-2 rounded-xl px-1 text-left text-sm font-black text-ink transition active:bg-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                          aria-expanded={vegAberto}
                        >
                          <span className="flex items-center gap-2"><span className="flex size-8 items-center justify-center rounded-lg bg-brand-light"><Leaf className="size-4 text-brand-dark" /></span> Ver opções de {item.nome}</span>
                          {vegAberto ? <ChevronUp className="size-4 text-muted" /> : <ChevronDown className="size-4 text-muted" />}
                        </button>
                        {vegAberto && (
                          <div className="mt-2 grid gap-2 sm:grid-cols-2">
                            {vegetais.map((veg, index) => (
                              <div key={`${item.id}-veg-${index}`} className="flex min-h-11 items-center justify-between gap-3 rounded-xl border border-border/70 bg-white px-3 py-2.5 text-sm">
                                <span className="font-bold leading-5 text-ink">{veg.nome}</span>
                                {tipoB && veg.porcaoG != null && (
                                  <span className="shrink-0 text-right">
                                    <span className="block rounded-lg bg-brand-light px-2 py-1 text-xs font-black text-brand-dark">{Math.round(veg.porcaoG)} g</span>
                                    {veg.medidaCaseira && <span className="mt-1 block max-w-[145px] text-[11px] font-semibold leading-4 text-muted">{veg.medidaCaseira}</span>}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {!ehVegetal && subs.length > 0 && (
                      <div className="mt-3 border-t border-border pt-2">
                        <button
                          onClick={() => setSubAberta((prev) => ({ ...prev, [item.id]: !aberta }))}
                          className="flex min-h-12 w-full items-center justify-between gap-2 rounded-xl px-1 text-left text-sm font-black text-ink transition active:bg-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                          aria-expanded={aberta}
                        >
                          <span className="flex items-center gap-2"><span className="flex size-8 items-center justify-center rounded-lg bg-white"><RefreshCw className="size-4 text-brand-dark" /></span> Ver substituições</span>
                          {aberta ? <ChevronUp className="size-4 text-muted" /> : <ChevronDown className="size-4 text-muted" />}
                        </button>
                        {aberta && (
                          <div className="mt-2 space-y-2">
                            {subs.map((sub, index) => (
                              <div key={`${sub.nome}-${index}`} className="flex min-h-12 items-center justify-between gap-3 rounded-xl border border-border/70 bg-white px-3 py-2.5 text-sm">
                                <span className="font-bold leading-5 text-ink">{sub.nome}</span>
                                <span className="shrink-0 text-right"><span className="block font-black text-brand-dark">{Math.round(sub.quantidadeG)} g</span>{sub.medidaCaseira && <span className="block max-w-[120px] text-[11px] font-semibold leading-4 text-muted">{sub.medidaCaseira}</span>}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              <div className="rounded-[18px] border border-brand/25 bg-brand-light/70 p-3.5 sm:p-4">
                <p className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.12em] text-brand-dark sm:text-xs"><Lightbulb className="size-4" /> Dica desta opção</p>
                <p className="mt-2 text-sm leading-5 text-ink sm:leading-6">{dicaDaOpcao(refeicao.nome, opcao.nome)}</p>
              </div>

              {refeicao.observacoes && (
                <div className="rounded-[18px] border border-border bg-white p-3.5 sm:p-4">
                  <p className="text-[11px] font-black uppercase tracking-[0.12em] text-muted sm:text-xs">Observação da refeição</p>
                  <p className="mt-2 whitespace-pre-line text-sm leading-5 text-ink sm:leading-6">{refeicao.observacoes}</p>
                </div>
              )}
            </div>
          </section>
        );
      })}

      {plano.substituicoes.length > 0 && (
        <section id="substituicoes" className="scroll-mt-3 rounded-[22px] border border-border/80 bg-surface shadow-card sm:rounded-[26px]">
          <button
            onClick={() => setListaFinalAberta((v) => !v)}
            className="flex min-h-20 w-full items-center justify-between gap-3 p-4 text-left sm:p-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            aria-expanded={listaFinalAberta}
          >
            <span className="flex min-w-0 items-start gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-light text-brand-dark"><ListChecks className="size-5" /></span>
              <span className="min-w-0">
                <span className="block text-[10px] font-black uppercase tracking-[0.14em] text-brand-dark sm:text-xs">Consulta rápida</span>
                <span className="mt-0.5 block text-lg font-black text-ink sm:text-xl">Lista ampliada de substituições</span>
                <span className="mt-1 block text-xs leading-4 text-muted sm:text-sm">Alternativas extras calculadas para as porções deste plano.</span>
              </span>
            </span>
            {listaFinalAberta ? <ChevronUp className="size-5 shrink-0 text-muted" /> : <ChevronDown className="size-5 shrink-0 text-muted" />}
          </button>

          {listaFinalAberta && (
            <div className="border-t border-border p-3 sm:p-5">
              <div className="space-y-5">
                {plano.refeicoes.map((refeicao) => {
                  const blocos = refeicao.opcoes
                    .flatMap((opcao) => opcao.itens.map((item) => ({ opcao, item, subs: substituicoesPorItem.get(item.id) ?? [] })))
                    .filter((x) => x.subs.length > 0 && x.item.papelMacro !== "livre" && x.item.papelMacro !== "vegetal_b");
                  if (!blocos.length) return null;
                  return (
                    <div key={`lista-${refeicao.id}`}>
                      <h3 className="text-base font-black text-ink">{refeicao.nome}</h3>
                      <div className="mt-2 space-y-3">
                        {blocos.map(({ opcao, item, subs }) => (
                          <div key={`lista-${item.id}`} className="rounded-[18px] border border-border/70 bg-bg-alt-2 p-3.5 sm:p-4">
                            <p className="text-[10px] font-black uppercase tracking-[0.1em] text-muted sm:text-xs">Opção {opcao.numero}{opcao.nome ? `: ${opcao.nome}` : ""}</p>
                            <p className="mt-1 text-sm font-black text-ink sm:text-base">No lugar de {item.nome}</p>
                            <div className="mt-2 space-y-2 sm:grid sm:grid-cols-2 sm:gap-2 sm:space-y-0">
                              {subs.map((sub, index) => (
                                <div key={`final-${item.id}-${index}`} className="flex min-h-12 items-center justify-between gap-3 rounded-xl border border-border/70 bg-white px-3 py-2.5 text-sm">
                                  <span className="font-bold leading-5 text-ink">{sub.nome}</span>
                                  <span className="shrink-0 text-right"><span className="block font-black text-brand-dark">{Math.round(sub.quantidadeG)} g</span>{sub.medidaCaseira && <span className="block max-w-[120px] text-[11px] font-semibold leading-4 text-muted">{sub.medidaCaseira}</span>}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>
      )}

      {plano.observacoes && (
        <section id="orientacoes" className="scroll-mt-3 rounded-[22px] border border-border/80 bg-surface p-4 shadow-card sm:rounded-[26px] sm:p-5">
          <div className="flex items-center gap-2"><span className="flex size-8 items-center justify-center rounded-lg bg-bg-alt"><Info className="size-4 text-brand-dark" /></span><p className="text-[11px] font-black uppercase tracking-[0.14em] text-brand-dark sm:text-xs">Orientações gerais</p></div>
          <p className="mt-3 whitespace-pre-line text-sm leading-6 text-ink">{plano.observacoes}</p>
        </section>
      )}

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border/80 bg-white/95 px-2 pb-[max(env(safe-area-inset-bottom),8px)] pt-1.5 shadow-[0_-10px_30px_rgba(4,20,12,0.10)] backdrop-blur-xl sm:hidden" aria-label="Navegação do plano">
        <div className="mx-auto grid max-w-md grid-cols-5 gap-1">
          <MobileNavButton onClick={() => irPara("topo-plano")} icon={Home} label="Início" />
          <MobileNavButton onClick={() => irPara("refeicoes")} icon={Utensils} label="Refeições" active />
          <MobileNavButton onClick={() => irPara("substituicoes")} icon={RefreshCw} label="Trocas" />
          <MobileNavButton onClick={() => irPara("orientacoes")} icon={Info} label="Orientações" />
          <MobileNavLink href="/paciente" icon={LayoutDashboard} label="Área" />
        </div>
      </nav>
    </div>
  );
}

function Resumo({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.07] px-3 py-2.5 backdrop-blur-sm sm:py-3">
      <p className="text-[9px] font-black uppercase tracking-[0.12em] text-white/45 sm:text-[11px]">{label}</p>
      <p className="mt-0.5 text-sm font-black text-white sm:mt-1 sm:text-base">{value}</p>
    </div>
  );
}

function MobileNavLink({ href, icon: Icon, label }: { href: string; icon: typeof Home; label: string }) {
  return (
    <a href={href} className="flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl text-[10px] font-bold text-muted transition active:bg-bg-alt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
      <Icon className="size-5" />
      <span>{label}</span>
    </a>
  );
}

function MobileNavButton({ onClick, icon: Icon, label, active = false }: { onClick: () => void; icon: typeof Home; label: string; active?: boolean }) {
  return (
    <button onClick={onClick} className={`flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl text-[10px] font-black transition active:bg-bg-alt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${active ? "text-brand-dark" : "text-muted"}`}>
      <Icon className={`size-5 ${active ? "stroke-[2.5]" : ""}`} />
      <span>{label}</span>
    </button>
  );
}
