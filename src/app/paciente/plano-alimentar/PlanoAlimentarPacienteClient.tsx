"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Utensils, RefreshCw, Lightbulb, ListChecks } from "lucide-react";
import type { PacientePlanoDashboard } from "@/services/paciente-plano.queries";

function formatarQuantidade(g?: number, texto?: string) {
  if (texto) return texto;
  if (g == null) return null;
  return `${Math.round(g)} g`;
}

function dicaDaOpcao(refeicao: string, nomeOpcao?: string | null) {
  const nome = (nomeOpcao ?? "").toLowerCase();
  const slot = refeicao.toLowerCase();

  if (nome.includes("pão com ovos")) return "Prepare os ovos mexidos, cozidos ou em omelete, conforme sua preferência. Se a manhã for corrida, deixe os ovos prontos na noite anterior e apenas aqueça. A fruta pode ser consumida junto ou logo depois.";
  if (nome.includes("iogurte") && nome.includes("whey")) return "Misture primeiro o whey ao iogurte até formar um creme e acrescente a fruta depois. Aveia e outros itens secos ficam melhores quando colocados somente na hora de consumir.";
  if (nome.includes("panqueca")) return "Amasse a banana, misture os ingredientes e prepare em frigideira antiaderente em fogo baixo. Você pode deixar a massa pronta por algumas horas na geladeira ou preparar a panqueca na noite anterior e apenas aquecer.";
  if (nome.includes("fruta") && nome.includes("cottage")) return "Deixe a fruta higienizada e a porção de cottage e castanhas já separadas. Para transportar, leve em potes pequenos e misture apenas na hora. É uma opção prática para dias de rotina corrida.";
  if (nome.includes("mini sanduíche")) return "Monte o sanduíche perto do horário de consumo ou leve o recheio separado para evitar que o pão fique úmido. Se precisar deixar pronto, mantenha refrigerado e bem embalado.";
  if (nome.includes("prato com feijão")) return "Considere os pesos dos alimentos já prontos. Para facilitar a semana, deixe arroz, feijão e proteína porcionados e varie temperos e vegetais. Use o azeite depois do preparo, na quantidade indicada.";
  if (nome.includes("prato sem feijão")) return "Boa opção para dias em que você quer uma refeição mais simples. Deixe carboidrato e proteína já porcionados e complete com vegetais. Varie ervas, limão e especiarias para não deixar a refeição repetitiva.";
  if (nome.includes("sanduíche proteico") || nome.includes("sanduíche com proteína")) return "Deixe a proteína pronta e porcionada para montar o sanduíche rapidamente. Acrescente vegetais somente na hora para melhorar a textura. Se for levar, transporte recheios mais úmidos separados do pão.";
  if (nome.includes("iogurte com fruta")) return "Mantenha o iogurte refrigerado e leve a fruta inteira ou já cortada em pote separado. Aveia, granola ou sementes ficam melhores quando acrescentadas somente no momento de comer.";
  if (nome.includes("pão com doce de leite")) return "Opção leve e de baixo volume para antes do treino. Monte próximo ao horário de sair e evite acrescentar outros recheios. Ajuste o intervalo antes do exercício conforme sua tolerância.";
  if (nome.includes("banana") && nome.includes("pasta de amendoim")) return "Use uma camada fina de pasta de amendoim, respeitando a quantidade indicada. Quanto mais perto do treino, mais importante manter essa porção pequena para não pesar na digestão.";
  if (nome.includes("pão") && nome.includes("pasta de amendoim")) return "Passe a pasta em camada fina e mantenha a preparação simples. Se o treino acontecer logo depois, observe seu conforto gastrointestinal e ajuste o intervalo com o nutricionista.";
  if (slot.includes("pré-treino")) return "Mantenha esta opção simples e com baixo volume. Observe conforto gastrointestinal, energia e desempenho para definir o melhor intervalo antes do treino.";
  if (slot.includes("almoço") || slot.includes("jantar")) return "Organize os alimentos já prontos e porcionados. Preparar proteína e carboidrato em maior quantidade algumas vezes por semana facilita a execução sem depender de improviso.";
  return "Deixe os ingredientes principais porcionados com antecedência e escolha a forma de preparo que melhor encaixa na sua rotina. A ideia é tornar esta opção fácil de repetir no dia a dia.";
}

export function PlanoAlimentarPacienteClient({ plano }: { plano: PacientePlanoDashboard }) {
  const [opcaoPorRefeicao, setOpcaoPorRefeicao] = useState<Record<string, number>>({});
  const [subAberta, setSubAberta] = useState<Record<string, boolean>>({});

  const substituicoesPorItem = useMemo(() => {
    const mapa = new Map<string, typeof plano.substituicoes>();
    for (const sub of plano.substituicoes) mapa.set(sub.itemId, [...(mapa.get(sub.itemId) ?? []), sub]);
    return mapa;
  }, [plano.substituicoes]);

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] bg-ink-deep p-5 text-white shadow-dark sm:p-7">
        <div className="flex items-start gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-brand text-ink-deep"><Utensils className="size-5" /></div>
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
              <div className="flex items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-brand-dark">Refeição</p><h2 className="mt-1 text-xl font-black text-ink">{refeicao.nome}</h2></div>{refeicao.opcoes.length > 1 && <span className="rounded-full bg-brand-light px-3 py-1 text-xs font-bold text-brand-dark">{refeicao.opcoes.length} opções</span>}</div>
              {refeicao.opcoes.length > 1 && <div className="mt-4 flex gap-2 overflow-x-auto pb-1 scrollbar-thin">{refeicao.opcoes.map((item) => <button key={item.numero} onClick={() => setOpcaoPorRefeicao((prev) => ({ ...prev, [refeicao.id]: item.numero }))} className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold transition ${item.numero === opcaoAtiva ? "bg-ink-deep text-white" : "bg-bg-alt text-muted hover:text-ink"}`}>Opção {item.numero}{item.nome ? `: ${item.nome}` : ""}</button>)}</div>}
            </div>
            <div className="space-y-3 p-4 sm:p-5">
              {opcao.itens.map((item) => {
                const subs = substituicoesPorItem.get(item.id) ?? [];
                const aberta = subAberta[item.id] ?? false;
                return <div key={item.id} className="rounded-2xl bg-bg-alt-2 p-4">
                  <p className="font-bold text-ink">{item.nome}</p>
                  {formatarQuantidade(item.quantidadeG, item.quantidadeTexto) && <p className="mt-1 text-sm font-semibold text-brand-dark">{formatarQuantidade(item.quantidadeG, item.quantidadeTexto)}</p>}
                  {item.ingredientes && item.ingredientes.length > 0 && <div className="mt-2 space-y-1">{item.ingredientes.map((ing, index) => <p key={`${ing.nome}-${index}`} className="text-sm text-muted">{ing.nome}: {Math.round(ing.quantidadeG)} g</p>)}</div>}
                  {subs.length > 0 && <div className="mt-3 border-t border-border pt-3"><button onClick={() => setSubAberta((prev) => ({ ...prev, [item.id]: !aberta }))} className="flex w-full items-center justify-between gap-2 text-left text-sm font-bold text-ink"><span className="flex items-center gap-2"><RefreshCw className="size-4 text-brand-dark" /> Ver substituições</span>{aberta ? <ChevronUp className="size-4 text-muted" /> : <ChevronDown className="size-4 text-muted" />}</button>{aberta && <div className="mt-3 space-y-2">{subs.map((sub, index) => <div key={`${sub.nome}-${index}`} className="flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2.5 text-sm"><span className="font-semibold text-ink">{sub.nome}</span><span className="shrink-0 font-bold text-brand-dark">{Math.round(sub.quantidadeG)} g</span></div>)}</div>}</div>}
                </div>;
              })}

              <div className="rounded-2xl border border-brand/30 bg-brand-light p-4">
                <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.12em] text-brand-dark"><Lightbulb className="size-4" /> Dica desta opção</p>
                <p className="mt-2 text-sm leading-6 text-ink">{dicaDaOpcao(refeicao.nome, opcao.nome)}</p>
              </div>

              {refeicao.observacoes && <div className="rounded-2xl border-l-4 border-brand bg-bg-alt p-4"><p className="text-xs font-black uppercase tracking-[0.12em] text-muted">Observação da refeição</p><p className="mt-2 whitespace-pre-line text-sm leading-6 text-ink">{refeicao.observacoes}</p></div>}
            </div>
          </section>
        );
      })}

      {plano.substituicoes.length > 0 && <section className="rounded-[24px] border border-border bg-surface p-5 shadow-card">
        <div className="flex items-start gap-3"><div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-light text-brand-dark"><ListChecks className="size-5" /></div><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-brand-dark">Lista ampliada</p><h2 className="mt-1 text-xl font-black text-ink">Substituições do plano</h2><p className="mt-1 text-sm text-muted">Alternativas extras calculadas de acordo com as porções de cada refeição.</p></div></div>
        <div className="mt-5 space-y-5">{plano.refeicoes.map((refeicao) => {
          const blocos = refeicao.opcoes.flatMap((opcao) => opcao.itens.map((item) => ({ opcao, item, subs: substituicoesPorItem.get(item.id) ?? [] }))).filter((x) => x.subs.length > 0);
          if (!blocos.length) return null;
          return <div key={`lista-${refeicao.id}`}><h3 className="font-black text-ink">{refeicao.nome}</h3><div className="mt-2 space-y-3">{blocos.map(({ opcao, item, subs }) => <div key={`lista-${item.id}`} className="rounded-2xl bg-bg-alt-2 p-4"><p className="text-xs font-bold uppercase tracking-[0.1em] text-muted">Opção {opcao.numero}{opcao.nome ? `: ${opcao.nome}` : ""}</p><p className="mt-1 font-bold text-ink">No lugar de {item.nome}</p><div className="mt-2 grid gap-2 sm:grid-cols-2">{subs.map((sub, index) => <div key={`final-${item.id}-${index}`} className="flex items-center justify-between rounded-xl bg-white px-3 py-2 text-sm"><span className="font-medium text-ink">{sub.nome}</span><span className="font-bold text-brand-dark">{Math.round(sub.quantidadeG)} g</span></div>)}</div></div>)}</div></div>;
        })}</div>
      </section>}

      {plano.observacoes && <section className="rounded-[24px] border border-border bg-surface p-5 shadow-card"><p className="text-xs font-bold uppercase tracking-[0.14em] text-brand-dark">Orientações</p><p className="mt-3 whitespace-pre-line text-sm leading-6 text-ink">{plano.observacoes}</p></section>}
    </div>
  );
}

function Resumo({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl bg-white/8 px-3 py-3"><p className="text-[11px] font-bold uppercase tracking-[0.12em] text-white/50">{label}</p><p className="mt-1 text-base font-black text-white">{value}</p></div>;
}
