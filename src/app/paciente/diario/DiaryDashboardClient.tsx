"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowLeft, ChevronDown, ChevronLeft, ChevronRight, Plus, Sparkles, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Macro = { kcal: number; p: number; c: number; f: number };
type MealOption = Macro & { id: string; label: string; est?: boolean };
type MealGroup = { title: string; options: MealOption[]; days?: number[] };
type MealData = Record<string, MealGroup>;
type CustomEntry = Macro & { type: "custom"; text: string };
type ExtraEntry = Macro & { id: string; text: string };
type DayData = Record<string, string | CustomEntry | ExtraEntry[] | undefined> & { extras?: ExtraEntry[] };
type RecordRow = { data: string; dados: DayData };

const NONE_OPTION: MealOption = { id: "none", label: "Não fiz essa refeição", kcal: 0, p: 0, c: 0, f: 0 };
const RAFAEL_GROLLA_ID = "8616a411-b34c-46c3-876d-27325827610c";

function dateKey(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function weekStart(date: Date) {
  const d = new Date(date);
  d.setHours(12, 0, 0, 0);
  const day = d.getDay();
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
  return d;
}

function formatDate(date: Date) {
  const text = new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "2-digit", month: "long" }).format(date);
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function shortDate(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" }).format(date);
}

function totalsFor(data: DayData | undefined, mealData: MealData): Macro {
  const total: Macro = { kcal: 0, p: 0, c: 0, f: 0 };
  if (!data) return total;
  for (const [groupId, group] of Object.entries(mealData)) {
    const selected = data[groupId];
    if (!selected) continue;
    if (typeof selected === "string") {
      if (selected === "none") continue;
      const opt = group.options.find((o) => o.id === selected);
      if (opt) {
        total.kcal += Number(opt.kcal || 0); total.p += Number(opt.p || 0); total.c += Number(opt.c || 0); total.f += Number(opt.f || 0);
      }
    } else if (!Array.isArray(selected) && selected && typeof selected === "object" && "kcal" in selected) {
      total.kcal += Number(selected.kcal || 0); total.p += Number(selected.p || 0); total.c += Number(selected.c || 0); total.f += Number(selected.f || 0);
    }
  }
  for (const extra of data.extras || []) {
    total.kcal += Number(extra.kcal || 0); total.p += Number(extra.p || 0); total.c += Number(extra.c || 0); total.f += Number(extra.f || 0);
  }
  return total;
}

function round(value: number) { return Math.round(Number(value || 0)); }

export default function DiaryDashboardClient({ patientId, patientName, title, targets, mealData, initialRecords }: {
  patientId: string;
  patientName: string;
  title: string;
  targets: Macro;
  mealData: MealData;
  initialRecords: RecordRow[];
}) {
  const supabase = useMemo(() => createClient() as any, []);
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [records, setRecords] = useState<Record<string, DayData>>(() => Object.fromEntries(initialRecords.map((r) => [r.data, r.dados || {}])));
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const [customDrafts, setCustomDrafts] = useState<Record<string, string>>({});
  const [extraDraft, setExtraDraft] = useState("");
  const [calculating, setCalculating] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const isRafael = patientId === RAFAEL_GROLLA_ID;

  function mealDataForDate(date: Date): MealData {
    if (!isRafael) return mealData;

    const day = date.getDay();
    const prefix = day === 2 || day === 4 ? "b_" : day === 1 || day === 3 || day === 5 ? "a_" : "";
    if (!prefix) return {};

    const orderA = ["a_cafe", "a_pre_treino", "a_almoco", "a_lanche", "a_mini_chegada", "a_jantar", "a_ceia"];
    const orderB = ["b_pre_treino", "b_cafe", "b_almoco", "b_lanche", "b_mini_chegada", "b_jantar", "b_ceia"];
    const order = prefix === "a_" ? orderA : orderB;

    return Object.fromEntries(
      order
        .filter((key) => {
          const group = mealData[key];
          return Boolean(group && (!group.days?.length || group.days.includes(day)));
        })
        .map((key) => [key, mealData[key]]),
    );
  }

  function displayMealTitle(group: MealGroup) {
    if (!isRafael) return group.title;
    return group.title
      .replace(/^Plano [AB] · /, "")
      .replace(/ · seg\/qua\/sex$/, "")
      .replace(/ · ter\/qui$/, "");
  }

  const key = dateKey(currentDate);
  const dayData = records[key] || {};
  const activeMealData = useMemo(() => mealDataForDate(currentDate), [currentDate, isRafael, mealData]);
  const totals = useMemo(() => totalsFor(dayData, activeMealData), [dayData, activeMealData]);
  const mealIds = Object.keys(activeMealData);
  const doneMeals = mealIds.filter((id) => Boolean(dayData[id])).length;
  const kcalPct = Math.min(100, Math.round((totals.kcal / Math.max(1, Number(targets.kcal))) * 100));
  const rafaelPlanLabel = isRafael
    ? currentDate.getDay() === 2 || currentDate.getDay() === 4
      ? "Plano B · Terça e Quinta"
      : currentDate.getDay() === 1 || currentDate.getDay() === 3 || currentDate.getDay() === 5
        ? "Plano A · Segunda, Quarta e Sexta"
        : "Fim de semana · sem plano fixo"
    : "";

  const monday = weekStart(currentDate);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  const weekRows = weekDays.map((d) => ({ date: d, key: dateKey(d), data: records[dateKey(d)] }));
  const recordedWeek = weekRows.filter((r) => r.data && Object.keys(r.data).length > 0);
  const weekTotals = recordedWeek.map((r) => totalsFor(r.data, mealDataForDate(r.date)));
  const weekAvg: Macro = weekTotals.length ? {
    kcal: weekTotals.reduce((a, b) => a + b.kcal, 0) / weekTotals.length,
    p: weekTotals.reduce((a, b) => a + b.p, 0) / weekTotals.length,
    c: weekTotals.reduce((a, b) => a + b.c, 0) / weekTotals.length,
    f: weekTotals.reduce((a, b) => a + b.f, 0) / weekTotals.length,
  } : { kcal: 0, p: 0, c: 0, f: 0 };

  async function persist(next: DayData, targetKey = key) {
    setSaving(true);
    setMessage("");
    const { error } = await supabase.from("diario_registros").upsert(
      { paciente_id: patientId, data: targetKey, dados: next },
      { onConflict: "paciente_id,data" },
    );
    setSaving(false);
    setMessage(error ? "Não foi possível salvar agora." : "Salvo automaticamente");
  }

  function updateDay(updater: (current: DayData) => DayData) {
    const next = updater(dayData);
    setRecords((all) => ({ ...all, [key]: next }));
    void persist(next);
  }

  async function changeDate(next: Date) {
    const nextKey = dateKey(next);
    setCurrentDate(next);
    if (records[nextKey]) return;
    const { data } = await supabase.from("diario_registros").select("dados").eq("paciente_id", patientId).eq("data", nextKey).maybeSingle();
    if (data?.dados) setRecords((all) => ({ ...all, [nextKey]: data.dados }));
  }

  function selectOption(groupId: string, optionId: string) {
    updateDay((current) => {
      const next = { ...current };
      if (next[groupId] === optionId) delete next[groupId]; else next[groupId] = optionId;
      return next;
    });
  }

  async function estimate(text: string) {
    const response = await fetch("/api/diario/estimate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }) });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error || "Não foi possível calcular.");
    return body as Macro;
  }

  async function addCustom(groupId: string) {
    const text = (customDrafts[groupId] || "").trim();
    if (!text) return;
    setCalculating(groupId);
    try {
      const macro = await estimate(text);
      updateDay((current) => ({ ...current, [groupId]: { type: "custom", text, ...macro } }));
      setCustomDrafts((d) => ({ ...d, [groupId]: "" }));
    } catch (e: any) {
      setMessage(e?.message || "Erro ao calcular.");
    } finally { setCalculating(""); }
  }

  async function addExtra() {
    const text = extraDraft.trim();
    if (!text) return;
    setCalculating("extra");
    try {
      const macro = await estimate(text);
      const entry: ExtraEntry = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, text, ...macro };
      updateDay((current) => ({ ...current, extras: [...(current.extras || []), entry] }));
      setExtraDraft("");
    } catch (e: any) {
      setMessage(e?.message || "Erro ao calcular.");
    } finally { setCalculating(""); }
  }

  function removeExtra(id: string) {
    updateDay((current) => ({ ...current, extras: (current.extras || []).filter((e) => e.id !== id) }));
  }

  const pastWeeks = Array.from({ length: 4 }, (_, index) => {
    const start = addDays(weekStart(new Date()), -(index + 1) * 7);
    const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
    const vals = days.map((d) => records[dateKey(d)]).filter(Boolean).map((d, i) => totalsFor(d, mealDataForDate(days[i])));
    return { start, end: addDays(start, 6), count: vals.length, avg: vals.length ? Math.round(vals.reduce((s, v) => s + v.kcal, 0) / vals.length) : 0 };
  }).filter((w) => w.count > 0);

  return (
    <main className="min-h-screen bg-[#F7F5EE] text-[#1F2B24]">
      <div className="mx-auto w-full max-w-[520px] px-4 pb-24 pt-[calc(16px+env(safe-area-inset-top))]">
        <header className="mb-5 flex items-center justify-between gap-3">
          <Link href="/paciente" className="grid size-11 place-items-center rounded-full bg-white shadow-sm" aria-label="Voltar"><ArrowLeft className="size-5 text-[#15442B]" /></Link>
          <div className="min-w-0 flex-1 text-center">
            <p className="text-[10px] font-black uppercase tracking-[.16em] text-[#19A968]">{title}</p>
            <h1 className="truncate text-xl font-black tracking-tight text-[#15442B]">{patientName}</h1>
          </div>
          <div className="size-11" />
        </header>

        <section className="mb-4 flex items-center gap-2 rounded-[16px] bg-white p-2 shadow-sm">
          <button onClick={() => void changeDate(addDays(currentDate, -1))} className="grid size-10 place-items-center rounded-full bg-[#F0EEE6]"><ChevronLeft className="size-5" /></button>
          <button onClick={() => void changeDate(new Date())} className="min-w-0 flex-1 text-center">
            <p className="truncate text-sm font-black text-[#15442B]">{formatDate(currentDate)}</p>
            {dateKey(currentDate) === dateKey(new Date()) ? <span className="text-[9px] font-black uppercase tracking-[.14em] text-[#19DD7F]">Hoje</span> : <span className="text-[9px] font-bold text-[#8A958D]">Toque para voltar a hoje</span>}
          </button>
          <button onClick={() => void changeDate(addDays(currentDate, 1))} className="grid size-10 place-items-center rounded-full bg-[#F0EEE6]"><ChevronRight className="size-5" /></button>
        </section>

        {isRafael ? <section className="mb-4 rounded-[16px] border border-[#DDE9E1] bg-white px-4 py-3 text-center shadow-sm"><p className="text-[10px] font-black uppercase tracking-[.12em] text-[#19A968]">Planejamento do dia</p><p className="mt-1 text-sm font-black text-[#15442B]">{rafaelPlanLabel}</p></section> : null}

        <section className="mb-4 overflow-hidden rounded-[22px] bg-[#15442B] p-5 text-white shadow-[0_14px_35px_rgba(21,68,43,.18)]">
          <div className="flex items-center gap-5">
            <div className="relative grid size-[104px] shrink-0 place-items-center rounded-full" style={{ background: `conic-gradient(#19DD7F ${kcalPct * 3.6}deg, rgba(255,255,255,.12) 0deg)` }}>
              <div className="grid size-[82px] place-items-center rounded-full bg-[#15442B] text-center"><div><b className="text-[22px] leading-none">{round(totals.kcal)}</b><p className="mt-0.5 text-[9px] uppercase tracking-[.1em] text-white/55">de {round(targets.kcal)} kcal</p></div></div>
            </div>
            <div className="min-w-0 flex-1 space-y-3">
              {([['Proteína','p'],['Carbo','c'],['Gordura','f']] as const).map(([label, macro]) => {
                const pct = Math.min(100, Number(totals[macro]) / Math.max(1, Number(targets[macro])) * 100);
                return <div key={macro}><div className="mb-1 flex justify-between text-[10px] font-bold"><span className="text-white/65">{label}</span><span>{round(totals[macro])} / {round(targets[macro])}g</span></div><div className="h-1.5 overflow-hidden rounded-full bg-white/15"><div className="h-full rounded-full bg-[#19DD7F]" style={{ width: `${pct}%` }} /></div></div>;
              })}
            </div>
          </div>
          <p className="mt-4 border-t border-white/10 pt-3 text-[11px] leading-5 text-white/70">{mealIds.length === 0 ? "Neste dia não há um dos dois planejamentos fixos do Rafael. Registre apenas o que consumir em Outros alimentos do dia." : doneMeals === 0 ? "Marque suas refeições conforme o dia for passando." : doneMeals < mealIds.length ? `${doneMeals} de ${mealIds.length} refeições registradas até agora.` : "Dia completo registrado. Constância é o que constrói resultado, não perfeição."}</p>
        </section>

        <section className="mb-4 rounded-[18px] border-l-4 border-[#19DD7F] bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-start justify-between gap-2"><div><p className="text-sm font-black text-[#15442B]">Média desta semana</p><p className="text-[10px] text-[#819087]">{shortDate(monday)}–{shortDate(addDays(monday, 6))} · {recordedWeek.length} dias registrados</p></div></div>
          <div className="grid grid-cols-4 gap-2">{[[round(weekAvg.kcal),'kcal'],[`${round(weekAvg.p)}g`,'proteína'],[`${round(weekAvg.c)}g`,'carbo'],[`${round(weekAvg.f)}g`,'gordura']].map(([value,label]) => <div key={label} className="rounded-xl bg-[#F7F5EE] px-1 py-2 text-center"><b className="text-sm text-[#15442B]">{value}</b><p className="mt-0.5 text-[8px] font-bold uppercase tracking-wide text-[#89958D]">{label}</p></div>)}</div>
        </section>

        <section className="mb-4 rounded-[18px] bg-white p-4 shadow-sm">
          <p className="mb-3 text-sm font-black text-[#15442B]">Painel da semana</p>
          <div className="grid grid-cols-7 gap-1">{weekRows.map((row) => {
            const t = totalsFor(row.data, mealDataForDate(row.date)); const future = row.date > new Date(); const has = Boolean(row.data && Object.keys(row.data).length); const ok = has && t.kcal <= Number(targets.kcal) * 1.05;
            return <button key={row.key} onClick={() => void changeDate(row.date)} className={`rounded-xl py-2 text-center ${row.key === key ? "bg-[#EFFBF4]" : ""}`}><p className="text-[8px] font-black uppercase text-[#8A958D]">{new Intl.DateTimeFormat('pt-BR',{weekday:'short'}).format(row.date).slice(0,3)}</p><div className={`mx-auto mt-1 grid size-8 place-items-center rounded-full border-2 text-sm ${future ? "border-dashed border-[#E7E2D4] opacity-40" : !has ? "border-dashed border-[#E7E2D4]" : ok ? "border-[#19DD7F] bg-[#EFFBF4]" : "border-[#D97A72] bg-[#FBEEEE]"}`}>{future || !has ? "" : ok ? "✓" : "!"}</div><p className="mt-1 text-[8px] text-[#8A958D]">{String(row.date.getDate()).padStart(2,'0')}</p></button>;
          })}</div>
          <div className="mt-3 flex flex-wrap gap-3 border-t border-[#EEEADF] pt-3 text-[9px] text-[#87938B]"><span>● dentro do planejado</span><span>● acima da meta</span><span>○ sem registro</span></div>
        </section>

        {pastWeeks.length ? <section className="mb-4 rounded-[18px] bg-white p-4 shadow-sm"><p className="mb-2 text-sm font-black text-[#15442B]">Histórico de semanas</p>{pastWeeks.map((w) => <div key={dateKey(w.start)} className="flex items-center justify-between border-b border-[#EEEADF] py-2.5 last:border-0"><div><p className="text-xs font-bold">{shortDate(w.start)}–{shortDate(w.end)}</p><p className="text-[9px] text-[#8A958D]">{w.count} dias registrados</p></div><b className="text-xs text-[#15442B]">{w.avg} kcal/dia</b></div>)}</section> : null}

        <div className="space-y-3">
          {Object.entries(activeMealData).map(([groupId, group]) => {
            const selected = dayData[groupId];
            const custom = selected && typeof selected === "object" && !Array.isArray(selected) ? selected as CustomEntry : null;
            const selectedOpt = typeof selected === "string" ? (selected === "none" ? NONE_OPTION : group.options.find((o) => o.id === selected)) : null;
            const isOpen = Boolean(openGroups[groupId]);
            return <section key={groupId} className="overflow-hidden rounded-[18px] bg-white shadow-sm">
              <button onClick={() => setOpenGroups((o) => ({ ...o, [groupId]: !o[groupId] }))} className="flex w-full items-center gap-3 p-4 text-left"><span className={`grid size-6 shrink-0 place-items-center rounded-full border-2 text-xs font-black ${selected ? "border-[#19DD7F] bg-[#19DD7F] text-[#15442B]" : "border-[#E7E2D4]"}`}>{selected ? "✓" : ""}</span><span className="min-w-0 flex-1"><b className="block text-sm text-[#1F2B24]">{displayMealTitle(group)}</b><span className="block truncate text-[11px] text-[#87938B]">{custom ? `${custom.text} · ${round(custom.kcal)} kcal` : selectedOpt?.label || "Toque para marcar"}</span></span><ChevronDown className={`size-4 text-[#87938B] transition ${isOpen ? "rotate-180" : ""}`} /></button>
              {isOpen ? <div className="border-t border-[#F0ECE2] px-4 pb-4 pt-3">
                <div className="space-y-2">{[...group.options, NONE_OPTION].map((opt) => <button key={opt.id} onClick={() => selectOption(groupId, opt.id)} className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left ${selected === opt.id ? "border-[#19DD7F] bg-[#EFFBF4]" : "border-[#E7E2D4]"}`}><span className={`size-4 rounded-full border-2 ${selected === opt.id ? "border-[#19DD7F] bg-[#19DD7F] shadow-[inset_0_0_0_3px_#EFFBF4]" : "border-[#D7D3C9]"}`} /><span className="min-w-0 flex-1 text-xs font-semibold">{opt.label}</span>{opt.id !== "none" ? <span className="shrink-0 text-[9px] font-bold text-[#7E8B82]">{round(opt.kcal)} kcal · {round(opt.p)}g P</span> : null}</button>)}</div>
                {custom ? <div className="mt-3 rounded-xl border border-[#19DD7F] bg-[#EFFBF4] p-3"><div className="flex justify-between gap-2"><b className="text-xs text-[#15442B]">Refeição diferente</b><button onClick={() => updateDay((c) => { const n={...c}; delete n[groupId]; return n; })} className="text-[10px] font-bold text-[#B5504A]">remover</button></div><p className="mt-1 text-xs italic">{custom.text}</p><p className="mt-2 text-[10px] font-bold text-[#15442B]">{round(custom.kcal)} kcal · {round(custom.p)}g P · {round(custom.c)}g C · {round(custom.f)}g G</p></div> : <div className="mt-3 border-t border-dashed border-[#E7E2D4] pt-3"><p className="mb-2 text-xs font-bold text-[#15442B]">Comeu algo diferente do plano?</p><textarea value={customDrafts[groupId] || ""} onChange={(e) => setCustomDrafts((d) => ({ ...d, [groupId]: e.target.value }))} rows={2} className="w-full rounded-xl border border-[#DED9CC] p-3 text-xs outline-none focus:border-[#19DD7F]" placeholder="Ex: 1 fatia de pizza e 1 copo de refrigerante" /><button onClick={() => void addCustom(groupId)} disabled={calculating === groupId} className="mt-2 inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#15442B] px-3 text-xs font-black text-white disabled:opacity-50"><Sparkles className="size-4" /> {calculating === groupId ? "Calculando…" : "Calcular com IA"}</button></div>}
              </div> : null}
            </section>;
          })}
        </div>

        <section className="mt-4 rounded-[18px] bg-white p-4 shadow-sm">
          <h2 className="text-sm font-black text-[#15442B]">Outros alimentos do dia</h2><p className="mt-1 text-[11px] leading-4 text-[#87938B]">Anote beliscos, comemorações ou qualquer alimento fora das refeições do plano.</p>
          <div className="mt-3 space-y-2">{(dayData.extras || []).map((extra) => <div key={extra.id} className="rounded-xl border border-[#19DD7F] bg-[#EFFBF4] p-3"><div className="flex gap-2"><p className="min-w-0 flex-1 text-xs italic">{extra.text}</p><button onClick={() => removeExtra(extra.id)} className="text-[#B5504A]"><Trash2 className="size-4" /></button></div><p className="mt-1 text-[10px] font-bold text-[#15442B]">{round(extra.kcal)} kcal · {round(extra.p)}g P · {round(extra.c)}g C · {round(extra.f)}g G</p></div>)}</div>
          <textarea value={extraDraft} onChange={(e) => setExtraDraft(e.target.value)} rows={2} className="mt-3 w-full rounded-xl border border-[#DED9CC] p-3 text-xs outline-none focus:border-[#19DD7F]" placeholder="Ex: 21h - um pedaço de bolo no aniversário" />
          <button onClick={() => void addExtra()} disabled={calculating === "extra"} className="mt-2 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#19DD7F] text-xs font-black text-[#15442B] disabled:opacity-50"><Plus className="size-4" /> {calculating === "extra" ? "Calculando…" : "Adicionar e calcular"}</button>
        </section>

        <p className={`mt-4 text-center text-[10px] ${message.includes("Não") || message.includes("Erro") ? "text-red-600" : "text-[#87938B]"}`}>{saving ? "Salvando…" : message || "As alterações são salvas automaticamente."}</p>
      </div>
    </main>
  );
}
