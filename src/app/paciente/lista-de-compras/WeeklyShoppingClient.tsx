"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, ClipboardList, Copy, Printer, ShoppingBasket } from "lucide-react";
import type { PacientePlanoDashboard } from "@/services/paciente-plano.queries";
import { buildList, cellKey, DAYS, formatQuantity, getSelectedItem, normalize, productOptions, type Week } from "@/lib/shopping/weekly";

export default function WeeklyShoppingClient({ plan, storageScope }: { plan: PacientePlanoDashboard; storageScope: string }) {
  const meals = useMemo(() => [...plan.refeicoes].filter(m => m.opcoes.length).sort((a, b) => a.ordem - b.ordem), [plan]);
  const [week, setWeek] = useState<Week>({});
  const [day, setDay] = useState(0);
  const [ready, setReady] = useState(false);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [extras, setExtras] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [tab, setTab] = useState<"menu" | "list">("menu");
  const [raw, setRaw] = useState(false);
  const [yields, setYields] = useState({ rice: "2.5", beans: "2.5", protein: "0.75" });
  const key = `weekly-shopping:v1:${storageScope}:${plan.id}`;
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(key) || "null");
      if (saved && typeof saved.week === "object" && saved.week) {
        setWeek(saved.week); setChecked(saved.checked || {}); setExtras(saved.extras || {});
      }
    } catch { setMessage("Não foi possível recuperar as escolhas anteriores neste aparelho."); }
    setReady(true);
  }, [key]);
  useEffect(() => {
    if (!ready) return;
    try { localStorage.setItem(key, JSON.stringify({ week, checked, extras })); }
    catch { setMessage("As escolhas estão disponíveis nesta tela, mas não puderam ser salvas neste aparelho."); }
  }, [week, checked, extras, ready, key]);
  const list = useMemo(() => buildList(plan, week), [plan, week]);
  const filled = DAYS.reduce((total, _, d) => total + meals.filter(m => week[cellKey(d, m.id)]?.option !== undefined).length, 0);
  const totalSlots = meals.length * 7;
  const input = "w-full rounded-xl border border-[#D8E2DB] bg-white px-3 py-3 text-sm text-[#12251A] focus:outline-none focus:ring-2 focus:ring-[#19DD7F]";
  const button = "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#D8E2DB] bg-white px-4 py-2 text-sm font-bold";
  function update(cell: string, patch: Partial<Week[string]>) {
    setWeek(w => ({ ...w, [cell]: { ...(w[cell] || { option: -1, include: true, swaps: {}, products: {} }), ...patch } }));
    setChecked({});
  }
  function copyDay() {
    setWeek(w => {
      const next = { ...w };
      for (let d = 0; d < 7; d++) for (const meal of meals) {
        const value = w[cellKey(day, meal.id)];
        if (value) next[cellKey(d, meal.id)] = { ...value, swaps: { ...value.swaps }, products: { ...value.products } };
      }
      return next;
    });
    setChecked({}); setMessage(`Escolhas de ${DAYS[day].toLowerCase()} repetidas nos sete dias. Você pode ajustar cada dia.`);
  }
  function textList() {
    return `LISTA DE COMPRAS — 7 DIAS\n\n${list.map(row => `${checked[row.name] ? "✓" : "□"} ${row.name}: ${row.unit === "livre" ? extras[row.name] || "quantidade a definir" : formatQuantity(row)}${row.note ? ` (${row.note})` : ""}`).join("\n")}\n\nPesos conforme o plano, inclusive quando indicados como prontos/cozidos. Quantidades de compra crua dependem do rendimento. Confira o que já tem em casa.`;
  }
  async function copyList() {
    try { await navigator.clipboard.writeText(textList()); setMessage("Lista copiada."); }
    catch { setMessage("Não foi possível copiar. Use Imprimir para salvar a lista em PDF."); }
  }
  if (!ready) return <main className="p-6">Carregando sua semana…</main>;
  return <main className="min-h-screen bg-[#F3F7F3] px-4 py-6 text-[#12251A]">
    <style>{`@media print { .shopping-controls { display:none!important; } .shopping-list { display:block!important; } main { background:white!important; } }`}</style>
    <div className="mx-auto max-w-3xl">
      <header className="shopping-controls mb-6"><Link href="/paciente" className="inline-flex items-center gap-2 text-sm font-bold"><ArrowLeft size={16} /> Área do paciente</Link>
        <div className="mt-6 flex items-center gap-3"><span className="rounded-2xl bg-[#19DD7F] p-3"><ShoppingBasket /></span><div><p className="text-xs font-bold uppercase tracking-widest text-[#54715F]">Sua semana organizada</p><h1 className="text-2xl font-black sm:text-3xl">Lista de compras</h1></div></div>
        <p className="mt-3 text-sm leading-6 text-[#54715F]">Escolha uma opção por refeição para os sete dias. As porções do seu plano são somadas automaticamente para uma pessoa.</p>
        <p className="mt-2 text-xs text-[#54715F]">Escolhas salvas neste navegador, separadas por paciente e plano.</p>
        <div className="mt-5 grid grid-cols-2 gap-2">{(["menu", "list"] as const).map(t => <button key={t} onClick={() => setTab(t)} className={`${button} ${tab === t ? "!border-[#19DD7F] !bg-[#19DD7F]" : ""}`}>{t === "menu" ? "1. Montar semana" : "2. Lista de compras"}</button>)}</div>
      </header>
      {message && <p role="status" className="shopping-controls mb-4 rounded-xl bg-[#E0F6E8] p-3 text-sm">{message}</p>}
      {tab === "menu" && <section className="shopping-controls">
        <div className="mb-4 flex flex-wrap gap-2" aria-label="Dia da semana">{DAYS.map((label, d) => <button key={label} onClick={() => setDay(d)} aria-pressed={day === d} className={`${button} ${day === d ? "!bg-[#12251A] !text-white" : ""}`}>{label}</button>)}</div>
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><p className="text-sm">{filled} de {totalSlots} refeições planejadas</p><button onClick={copyDay} className={button}><Copy size={16} /> Repetir este dia na semana</button></div>
        {meals.map(meal => {
          const cell = cellKey(day, meal.id); const choice = week[cell];
          const selected = meal.opcoes.find(o => o.numero === choice?.option);
          return <article key={cell} className="mb-4 rounded-3xl border border-[#D8E2DB] bg-white p-5">
            <h2 className="mb-3 text-base font-black">{meal.nome}</h2>
            <label className="block"><span className="sr-only">Opção para {meal.nome} na {DAYS[day]}</span><select className={input} value={choice?.option ?? ""} onChange={e => update(cell, { option: Number(e.target.value), swaps: {}, products: {} })}>
              <option value="" disabled>Selecione uma opção</option><option value={-1}>Não vou fazer esta refeição</option>
              {meal.opcoes.map(o => <option key={o.numero} value={o.numero}>{o.nome || `Opção ${o.numero}`}</option>)}
            </select></label>
            {selected && choice && <><label className="mt-3 flex items-center gap-2 text-sm"><input type="checkbox" checked={choice.include} onChange={e => update(cell, { include: e.target.checked })} /> Incluir na compra (desmarque se comer fora ou já tiver tudo)</label>
              <div className="mt-4 space-y-3">{selected.itens.map(item => {
                const alternatives = plan.substituicoes.filter(s => s.itemId === item.id);
                const current = getSelectedItem(plan, item, choice); const products = productOptions(current.name);
                return <div key={item.id} className="rounded-xl bg-[#F3F7F3] p-3"><p className="text-sm font-semibold">{current.name}{current.q > 1 ? ` · ${current.q.toLocaleString("pt-BR")} ${normalize(current.name).includes("leite") ? "ml" : "g"}` : ""}</p>
                  {alternatives.length > 0 && <label className="mt-2 block text-xs">Alimento / substituição<select className={`${input} mt-1`} value={choice.swaps[item.id] ?? -1} onChange={e => update(cell, { swaps: { ...choice.swaps, [item.id]: Number(e.target.value) }, products: { ...choice.products, [item.id]: "" } })}><option value={-1}>{item.nome} (principal)</option>{alternatives.map((s, i) => <option key={`${s.nome}:${i}`} value={i}>{s.nome} · {s.quantidadeG} g</option>)}</select></label>}
                  {products.length > 0 && <label className="mt-2 block text-xs">O que vai comprar?<select className={`${input} mt-1`} value={choice.products[item.id] || products[0]} onChange={e => update(cell, { products: { ...choice.products, [item.id]: e.target.value } })}>{products.map(p => <option key={p}>{p}</option>)}</select></label>}
                </div>;
              })}</div>
              {selected.observacoes && <details className="mt-3 text-sm"><summary className="cursor-pointer font-bold">Orientações desta opção</summary><p className="mt-2 whitespace-pre-line leading-6 text-[#54715F]">{selected.observacoes}</p></details>}
            </>}
          </article>;
        })}
        <button onClick={() => { setTab("list"); window.scrollTo({ top: 0, behavior: "smooth" }); }} className={`${button} w-full !bg-[#19DD7F]`}><ClipboardList size={18} /> Gerar lista da semana</button>
      </section>}
      <section className={`shopping-list ${tab !== "list" ? "hidden" : ""}`}>
        <div className="rounded-3xl border border-[#D8E2DB] bg-white p-5 sm:p-7">
          <h2 className="text-xl font-black">Compras para 7 dias</h2><p className="mt-2 text-sm text-[#54715F]">{filled}/{totalSlots} refeições planejadas. Só entram as opções marcadas para compra.</p>
          {filled < totalSlots && <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">Lista parcial: faltam {totalSlots - filled} escolhas. Volte à semana e selecione uma opção ou “Não vou fazer” em cada refeição.</p>}
          <p className="mt-3 text-xs leading-5 text-[#54715F]">As quantidades abaixo correspondem às porções do plano. Alimentos descritos como cozidos ou prontos são pesados depois do preparo. Arredonde unidades para cima na compra e confira o peso da embalagem.</p>
          <div className="shopping-controls my-5 flex flex-wrap gap-2"><button className={button} onClick={copyList}><Copy size={16} /> Copiar lista</button><button className={button} onClick={() => window.print()}><Printer size={16} /> Imprimir / PDF</button></div>
          <details className="shopping-controls mb-5 rounded-xl bg-[#F3F7F3] p-3"><summary className="cursor-pointer text-sm font-bold">Vou cozinhar: estimar a compra crua</summary><p className="my-2 text-xs leading-5">Estimativas ajustáveis, não pesos exatos de compra. Rendimento = peso pronto ÷ peso cru. Use o rendimento do seu preparo, inclusive a quantidade de caldo no feijão. Outros alimentos continuam com o peso indicado no plano.</p><label className="flex gap-2 text-sm"><input type="checkbox" checked={raw} onChange={e => setRaw(e.target.checked)} /> Mostrar estimativas</label><div className="mt-3 grid gap-2 sm:grid-cols-3">{([['rice', 'Arroz'], ['beans', 'Feijão com caldo'], ['protein', 'Carnes e peixe']] as const).map(([k, label]) => <label key={k} className="text-xs">{label}<input className={`${input} mt-1`} type="number" min="0.1" step="0.05" value={yields[k]} onChange={e => setYields(v => ({ ...v, [k]: e.target.value }))} /></label>)}</div></details>
          {!list.length && <p className="py-7 text-sm">Escolha as refeições e marque o que precisa comprar para gerar sua lista.</p>}
          <ul className="divide-y divide-[#E3EAE5]">{list.map(row => {
            const yieldValue = row.preparation ? Number(yields[row.preparation]) : 0;
            const estimate = raw && yieldValue > 0 ? row.quantity / yieldValue : null;
            return <li key={row.name} className="py-4"><div className="flex items-start gap-3"><button aria-label={`${checked[row.name] ? "Desmarcar" : "Marcar"} ${row.name}`} aria-pressed={Boolean(checked[row.name])} onClick={() => setChecked(c => ({ ...c, [row.name]: !c[row.name] }))} className={`mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-lg border ${checked[row.name] ? "border-[#19DD7F] bg-[#19DD7F]" : "border-[#ACC3B3]"}`}>{checked[row.name] && <Check size={16} />}</button><div className="flex-1"><div className="flex flex-wrap justify-between gap-2"><span className={`text-sm font-bold ${checked[row.name] ? "line-through opacity-50" : ""}`}>{row.name}</span><b className="text-sm">{row.unit === "livre" ? extras[row.name] || "A definir" : formatQuantity(row)}</b></div>{row.note && <p className="mt-1 text-xs text-[#54715F]">{row.note}</p>}{estimate !== null && <p className="mt-1 text-sm text-[#377A50]">Compra crua estimada: ≈ {Math.ceil(estimate)} g</p>}{row.unit === "livre" && <label className="shopping-controls mt-2 block text-xs">Quantidade que deseja comprar na semana<input className={`${input} mt-1`} placeholder="Ex.: 2 pés de alface + 6 tomates" value={extras[row.name] || ""} onChange={e => setExtras(v => ({ ...v, [row.name]: e.target.value }))} /></label>}</div></div></li>;
          })}</ul>
          <p className="mt-5 text-xs leading-5 text-[#54715F]">Itens à vontade e temperos não têm quantidade definida no plano. Complete esses itens conforme seu preparo. Óleo adicional e receitas sem composição detalhada precisam ser conferidos separadamente.</p>
        </div>
      </section>
    </div>
  </main>;
}
