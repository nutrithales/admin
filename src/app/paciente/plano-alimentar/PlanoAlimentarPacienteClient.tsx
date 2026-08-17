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
  Dumbbell,
  BookOpen,
  ClipboardCheck,
  Leaf,
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

  const irParaRefeicao = (id: string) => document.getElementById(slugRefeicao(id))?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <div className="mx-auto max-w-3xl space-y-4 pb-28 sm:space-y-6 sm:pb-8">
      <section className="rounded-[24px] bg-ink-deep p-4 text-white shadow-dark sm:rounded-[28px] sm:p-7">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-brand text-ink-deep sm:size-11"><Utensils className="size-5" /></div>
          <div className="min-w-0"><p className="text-[11px] font-bold uppercase tracking-[0.16em] text-brand sm:text-xs">Seu plano alimentar</p><h1 className="mt-1 line-clamp-2 text-xl font-black leading-tight sm:text-3xl">{plano.titulo}</h1><p className="mt-1.5 text-xs text-white/65 sm:text-sm">{plano.protocoloNome ?? "Plano individualizado"}</p></div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:mt-6 sm:grid-cols-4">
          {plano.metas.kcal != null && <Resumo label="Energia" value={`${Math.round(plano.metas.kcal)} kcal`} />}
          {plano.metas.proteinaG != null && <Resumo label="Proteína" value={`${Math.round(plano.metas.proteinaG)} g`} />}
          {plano.metas.carboidratoG != null && <Resumo label="Carboidrato" value={`${Math.round(plano.metas.carboidratoG)} g`} />}
          {plano.metas.gorduraG != null && <Resumo label="Gordura" value={`${Math.round(plano.metas.gorduraG)} g`} />}
        </div>
      </section>

      <section className="rounded-[20px] border border-border bg-surface p-3 shadow-card sm:p-4">
        <p className="px-1 text-[10px] font-black uppercase tracking-[0.14em] text-muted sm:text-xs">Ir direto para</p>
        <div className="mt-2 flex snap-x gap-2 overflow-x-auto pb-1 scrollbar-thin">
          {plano.refeicoes.map((refeicao) => <button key={`atalho-${refeicao.id}`} onClick={() => irParaRefeicao(refeicao.id)} className="min-h-11 shrink-0 snap-start rounded-full border border-border bg-bg-alt px-4 py-2 text-sm font-bold text-ink transition active:scale-[0.98]">{refeicao.nome}</button>)}
        </div>
      </section>

      {plano.refeicoes.map((refeicao) => {
        const opcaoAtiva = opcaoPorRefeicao[refeicao.id] ?? refeicao.opcoes[0]?.numero ?? 1;
        const opcao = refeicao.opcoes.find((item) => item.numero === opcaoAtiva) ?? refeicao.opcoes[0];
        if (!opcao) return null;
        return (
          <section id={slugRefeicao(refeicao.id)} key={refeicao.id} className="scroll-mt-4 overflow-hidden rounded-[22px] border border-border bg-surface shadow-card sm:rounded-[24px]">
            <div className="border-b border-border px-4 py-3.5 sm:px-5 sm:py-4">
              <div className="flex items-center justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-brand-dark sm:text-xs">Refeição</p><h2 className="mt-0.5 text-lg font-black text-ink sm:text-xl">{refeicao.nome}</h2></div>{refeicao.opcoes.length > 1 && <span className="rounded-full bg-brand-light px-2.5 py-1 text-[11px] font-bold text-brand-dark sm:px-3 sm:text-xs">{refeicao.opcoes.length} opções</span>}</div>
              {refeicao.opcoes.length > 1 && <div className="-mx-1 mt-3 flex snap-x gap-2 overflow-x-auto px-1 pb-1 scrollbar-thin sm:mt-4">{refeicao.opcoes.map((item) => <button key={item.numero} onClick={() => setOpcaoPorRefeicao((prev) => ({ ...prev, [refeicao.id]: item.numero }))} className={`min-h-11 shrink-0 snap-start rounded-full px-4 py-2 text-left text-sm font-bold transition active:scale-[0.98] ${item.numero === opcaoAtiva ? "bg-ink-deep text-white" : "bg-bg-alt text-muted hover:text-ink"}`}><span className="block">Opção {item.numero}</span>{item.nome && <span className="block max-w-[220px] truncate text-[11px] font-semibold opacity-75">{item.nome}</span>}</button>)}</div>}
            </div>

            <div className="space-y-2.5 p-3.5 sm:space-y-3 sm:p-5">
              {opcao.itens.map((item) => {
                const subs = substituicoesPorItem.get(item.id) ?? [];
                const aberta = subAberta[item.id] ?? false;
                const tipoA = item.papelMacro === "livre";
                const tipoB = item.papelMacro === "vegetal_b";
                const ehVegetal = tipoA || tipoB;
                const vegetais = tipoA ? (plano.vegetais?.tipoA ?? []) : tipoB ? (plano.vegetais?.tipoB ?? []) : [];
                const vegAberto = vegetalAberto[item.id] ?? false;
                return (
                  <div key={item.id} className="rounded-2xl bg-bg-alt-2 p-3.5 sm:p-4">
                    <div className="min-w-0">
                      <p className="text-[15px] font-bold leading-5 text-ink sm:text-base">{item.nome}</p>
                      {formatarQuantidade(item.quantidadeG, item.quantidadeTexto) && <div className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-0.5"><p className="text-sm font-black text-brand-dark">{formatarQuantidade(item.quantidadeG, item.quantidadeTexto)}</p>{item.medidaCaseira && <p className="text-xs font-semibold text-muted">{item.medidaCaseira}</p>}</div>}
                      {item.ingredientes && item.ingredientes.length > 0 && <div className="mt-2 space-y-1">{item.ingredientes.map((ing, index) => <p key={`${ing.nome}-${index}`} className="text-sm leading-5 text-muted">{ing.nome}: <span className="font-semibold text-ink">{Math.round(ing.quantidadeG)} g</span>{ing.medidaCaseira ? ` (${ing.medidaCaseira})` : ""}</p>)}</div>}
                    </div>

                    {ehVegetal && vegetais.length > 0 && <div className="mt-3 border-t border-border pt-2.5"><button onClick={() => setVegetalAberto((prev) => ({ ...prev, [item.id]: !vegAberto }))} className="flex min-h-11 w-full items-center justify-between gap-2 text-left text-sm font-bold text-ink active:opacity-70" aria-expanded={vegAberto}><span className="flex items-center gap-2"><Leaf className="size-4 text-brand-dark" /> Ver opções de {item.nome}</span>{vegAberto ? <ChevronUp className="size-4 text-muted" /> : <ChevronDown className="size-4 text-muted" />}</button>{vegAberto && <div className="mt-2 grid gap-2 sm:grid-cols-2">{vegetais.map((veg, index) => <div key={`${item.id}-veg-${index}`} className="flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2.5 text-sm"><span className="font-semibold leading-5 text-ink">{veg.nome}</span>{tipoB && veg.porcaoG != null && <span className="shrink-0 font-black text-brand-dark">{Math.round(veg.porcaoG)} g</span>}</div>)}</div>}</div>}

                    {!ehVegetal && subs.length > 0 && <div className="mt-3 border-t border-border pt-2.5"><button onClick={() => setSubAberta((prev) => ({ ...prev, [item.id]: !aberta }))} className="flex min-h-11 w-full items-center justify-between gap-2 text-left text-sm font-bold text-ink active:opacity-70" aria-expanded={aberta}><span className="flex items-center gap-2"><RefreshCw className="size-4 text-brand-dark" /> Ver substituições</span>{aberta ? <ChevronUp className="size-4 text-muted" /> : <ChevronDown className="size-4 text-muted" />}</button>{aberta && <div className="mt-2 space-y-2">{subs.map((sub, index) => <div key={`${sub.nome}-${index}`} className="flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2.5 text-sm"><span className="font-semibold leading-5 text-ink">{sub.nome}</span><span className="shrink-0 text-right"><span className="block font-black text-brand-dark">{Math.round(sub.quantidadeG)} g</span>{sub.medidaCaseira && <span className="block text-[11px] font-semibold text-muted">{sub.medidaCaseira}</span>}</span></div>)}</div>}</div>}
                  </div>
                );
              })}

              <div className="rounded-2xl border border-brand/30 bg-brand-light p-3.5 sm:p-4"><p className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.12em] text-brand-dark sm:text-xs"><Lightbulb className="size-4" /> Dica desta opção</p><p className="mt-2 text-sm leading-5 text-ink sm:leading-6">{dicaDaOpcao(refeicao.nome, opcao.nome)}</p></div>
              {refeicao.observacoes && <div className="rounded-2xl border-l-4 border-brand bg-bg-alt p-3.5 sm:p-4"><p className="text-[11px] font-black uppercase tracking-[0.12em] text-muted sm:text-xs">Observação da refeição</p><p className="mt-2 whitespace-pre-line text-sm leading-5 text-ink sm:leading-6">{refeicao.observacoes}</p></div>}
            </div>
          </section>
        );
      })}

      {plano.substituicoes.length > 0 && <section className="rounded-[22px] border border-border bg-surface shadow-card sm:rounded-[24px]">
        <button onClick={() => setListaFinalAberta((v) => !v)} className="flex min-h-16 w-full items-center justify-between gap-3 p-4 text-left sm:p-5" aria-expanded={listaFinalAberta}><span className="flex min-w-0 items-start gap-3"><span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-light text-brand-dark"><ListChecks className="size-5" /></span><span className="min-w-0"><span className="block text-[11px] font-bold uppercase tracking-[0.14em] text-brand-dark sm:text-xs">Lista ampliada</span><span className="mt-0.5 block text-lg font-black text-ink sm:text-xl">Substituições do plano</span><span className="mt-1 block text-xs leading-4 text-muted sm:text-sm">Todas as alternativas extras calculadas para suas porções.</span></span></span>{listaFinalAberta ? <ChevronUp className="size-5 shrink-0 text-muted" /> : <ChevronDown className="size-5 shrink-0 text-muted" />}</button>
        {listaFinalAberta && <div className="border-t border-border p-3.5 sm:p-5"><div className="space-y-5">{plano.refeicoes.map((refeicao) => { const blocos = refeicao.opcoes.flatMap((opcao) => opcao.itens.map((item) => ({ opcao, item, subs: substituicoesPorItem.get(item.id) ?? [] }))).filter((x) => x.subs.length > 0 && x.item.papelMacro !== "livre" && x.item.papelMacro !== "vegetal_b"); if (!blocos.length) return null; return <div key={`lista-${refeicao.id}`}><h3 className="font-black text-ink">{refeicao.nome}</h3><div className="mt-2 space-y-3">{blocos.map(({ opcao, item, subs }) => <div key={`lista-${item.id}`} className="rounded-2xl bg-bg-alt-2 p-3.5 sm:p-4"><p className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted sm:text-xs">Opção {opcao.numero}{opcao.nome ? `: ${opcao.nome}` : ""}</p><p className="mt-1 text-sm font-bold text-ink sm:text-base">No lugar de {item.nome}</p><div className="mt-2 space-y-2 sm:grid sm:grid-cols-2 sm:gap-2 sm:space-y-0">{subs.map((sub, index) => <div key={`final-${item.id}-${index}`} className="flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2.5 text-sm"><span className="font-medium leading-5 text-ink">{sub.nome}</span><span className="shrink-0 text-right"><span className="block font-black text-brand-dark">{Math.round(sub.quantidadeG)} g</span>{sub.medidaCaseira && <span className="block text-[11px] font-semibold text-muted">{sub.medidaCaseira}</span>}</span></div>)}</div></div>)}</div></div>; })}</div></div>}
      </section>}

      {plano.observacoes && <section className="rounded-[22px] border border-border bg-surface p-4 shadow-card sm:rounded-[24px] sm:p-5"><p className="text-[11px] font-bold uppercase tracking-[0.14em] text-brand-dark sm:text-xs">Orientações</p><p className="mt-2 whitespace-pre-line text-sm leading-5 text-ink sm:mt-3 sm:leading-6">{plano.observacoes}</p></section>}

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-white/95 px-2 pb-[max(env(safe-area-inset-bottom),8px)] pt-2 shadow-[0_-8px_24px_rgba(0,0,0,0.08)] backdrop-blur sm:hidden"><div className="mx-auto grid max-w-md grid-cols-5"><MobileNavItem href="/paciente" icon={Home} label="Início" /><MobileNavItem href="/paciente/plano-alimentar" icon={Utensils} label="Dieta" active /><MobileNavItem href="/paciente" icon={Dumbbell} label="Treinos" /><MobileNavItem href="/paciente" icon={BookOpen} label="Materiais" /><MobileNavItem href="/paciente" icon={ClipboardCheck} label="Check-in" /></div></nav>
    </div>
  );
}

function Resumo({ label, value }: { label: string; value: string }) { return <div className="rounded-2xl bg-white/8 px-3 py-2.5 sm:py-3"><p className="text-[10px] font-bold uppercase tracking-[0.1em] text-white/50 sm:text-[11px] sm:tracking-[0.12em]">{label}</p><p className="mt-0.5 text-sm font-black text-white sm:mt-1 sm:text-base">{value}</p></div>; }

function MobileNavItem({ href, icon: Icon, label, active = false }: { href: string; icon: typeof Home; label: string; active?: boolean }) { return <a href={href} className={`flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl text-[10px] font-bold ${active ? "text-brand-dark" : "text-muted"}`}><Icon className={`size-5 ${active ? "stroke-[2.4]" : ""}`} /><span>{label}</span></a>; }
