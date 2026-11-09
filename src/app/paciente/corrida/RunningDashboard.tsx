"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, CheckCircle2, Lock, Save, Activity } from "lucide-react";
import { saveRunningRecord } from "@/services/running.actions";
import { brasilDate, durationText, isReleased, pace, type RunningData, type RunningRecord, type RunningWorkout } from "@/lib/running/core";

const dateLabel = (date: string) => new Date(`${date}T12:00:00Z`).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", weekday: "short", timeZone: "America/Sao_Paulo" });
const monthLabel = (date: string) => new Date(`${date}T12:00:00Z`).toLocaleDateString("pt-BR", { month: "long", year: "numeric", timeZone: "America/Sao_Paulo" });
const inputClass = "mt-1 min-h-12 w-full rounded-xl border border-border bg-white px-3 py-2 text-base text-ink focus:outline-none focus:ring-2 focus:ring-brand";

export default function RunningDashboard({ data, admin = false, backHref = "/paciente" }: { data: RunningData; admin?: boolean; backHref?: string }) {
  const router = useRouter();
  const [selected, setSelected] = useState(data.cycles.filter(c => isReleased(c.liberar_em, data.today)).at(-1)?.id ?? data.cycles[0]?.id);
  const [records, setRecords] = useState(data.records);
  useEffect(() => { setRecords(data.records); }, [data.records]);
  useEffect(() => {
    const refresh = () => { if (brasilDate() !== data.today) router.refresh(); };
    const timer = window.setInterval(refresh, 60000);
    window.addEventListener("focus", refresh);
    return () => { window.clearInterval(timer); window.removeEventListener("focus", refresh); };
  }, [data.today, router]);
  const cycle = data.cycles.find(c => c.id === selected) ?? data.cycles[0];
  if (!cycle) return <main className="p-6">Nenhum ciclo cadastrado.</main>;
  const released = admin || isReleased(cycle.liberar_em, data.today);
  const workouts = data.workouts.filter(w => w.ciclo_id === cycle.id);
  const ids = new Set(workouts.map(w => w.id));
  const completed = records.filter(r => ids.has(r.treino_id) && r.concluido);
  const distance = completed.reduce((n, r) => n + Number(r.distancia_km ?? 0), 0);
  const times = completed.reduce((n, r) => n + Number(r.duracao_seg ?? 0), 0);
  const effort = completed.filter(r => r.rpe != null);
  const average = effort.length ? (effort.reduce((n, r) => n + Number(r.rpe), 0) / effort.length).toFixed(1) : "—";
  return <main className="min-h-screen bg-bg px-4 py-6 text-ink"><div className="mx-auto max-w-3xl">
    <Link href={backHref} className="inline-flex min-h-11 items-center gap-2 text-sm font-bold"><ArrowLeft size={16} /> {admin ? "Perfil do paciente" : "Área do paciente"}</Link>
    <header className="mt-5 rounded-3xl bg-ink-deep p-6 text-white"><p className="text-xs font-bold uppercase tracking-widest text-brand">Corrida e evolução</p><h1 className="mt-2 text-3xl font-black">{data.patientName.split(" ")[0]}, sua jornada na corrida</h1><p className="mt-3 text-sm leading-6 text-white/75">Três sessões por semana. As provas contam como treino. O plano prioriza constância e recuperação.</p>{admin && <p className="mt-3 text-sm text-brand">Visão administrativa: inclui os meses futuros. Os registros abaixo são somente para consulta.</p>}</header>
    <nav aria-label="Mês de treinamento" className="my-5 grid gap-2 sm:grid-cols-3">{data.cycles.map(c => {
      const locked = !admin && !isReleased(c.liberar_em, data.today);
      return <button key={c.id} type="button" onClick={() => setSelected(c.id)} aria-pressed={c.id === selected} className={`min-h-16 rounded-2xl border px-4 py-3 text-left ${c.id === selected ? "border-brand bg-brand-light" : "border-border bg-white"}`}><span className="flex items-center gap-2 font-bold capitalize">{locked && <Lock size={15} />}{monthLabel(c.mes)}</span><span className="mt-1 block text-xs text-muted">{locked ? `Abre em ${c.liberar_em.split("-").reverse().join("/")}` : "Ver treinos e registros"}</span></button>;
    })}</nav>
    {!released ? <section className="rounded-3xl border border-border bg-white p-7"><Lock className="mb-3 text-brand-dark" /><h2 className="text-xl font-bold">Este mês ainda está fechado</h2><p className="mt-3 leading-6">Os treinos abrem automaticamente em {cycle.liberar_em.split("-").reverse().join("/")}, a partir de 00h no horário de Brasília. O conteúdo e os registros dos meses anteriores continuam disponíveis.</p></section> : <>
      <section className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">{[["Concluídos", `${completed.length}/${workouts.length}`], ["Distância registrada", `${distance.toFixed(1)} km`], ["Tempo registrado", `${Math.round(times / 60)} min`], ["Esforço médio", average]].map(([label, value]) => <div key={label} className="rounded-2xl border border-border bg-white p-4"><p className="text-xs text-muted">{label}</p><p className="mt-1 text-xl font-black">{value}</p></div>)}</section>
      <section className="mb-5 rounded-3xl border border-brand/25 bg-brand-light p-5"><h2 className="text-lg font-bold">{cycle.titulo}</h2><p className="mt-2 text-sm leading-6">{cycle.objetivo}</p><details className="mt-3"><summary className="min-h-11 cursor-pointer py-2 font-bold">Como seguir este mês</summary><p className="whitespace-pre-line text-sm leading-6">{cycle.orientacoes}</p></details></section>
      <div className="space-y-4">{workouts.map(w => <WorkoutCard key={`${w.id}:${admin}`} workout={w} record={records.find(r => r.treino_id === w.id)} today={data.today} admin={admin} onSaved={saved => setRecords(previous => [...previous.filter(r => r.treino_id !== saved.treino_id), saved])} />)}</div>
    </>}
  </div></main>;
}

function WorkoutCard({ workout: w, record, today, admin, onSaved }: { workout: RunningWorkout; record?: RunningRecord; today: string; admin: boolean; onSaved: (record: RunningRecord) => void }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [dirty, setDirty] = useState(false);
  const [form, setForm] = useState(() => ({ data_realizada: record?.data_realizada ?? today, tempo: durationText(record?.duracao_seg ?? null), distancia_km: String(record?.distancia_km ?? ""), rpe: String(record?.rpe ?? ""), dor: String(record?.dor ?? ""), sono_horas: String(record?.sono_horas ?? ""), fc_media: String(record?.fc_media ?? ""), terreno: record?.terreno ?? "", feedback: record?.feedback ?? "" }));
  function edit(key: keyof typeof form, value: string) { setForm(f => ({ ...f, [key]: value })); setDirty(true); setMessage("Alterações ainda não salvas."); }
  async function save(concluido = record?.concluido ?? false) {
    setSaving(true); setMessage("");
    try {
      const result = await saveRunningRecord({ treinoId: w.id, concluido, ...form });
      if (result.success) { onSaved(result.record); setDirty(false); setMessage("Registro salvo. Disponível também em outros aparelhos."); }
      else setMessage(result.message);
    } catch { setMessage("Falha de conexão. Os dados continuam na tela; tente salvar novamente."); }
    finally { setSaving(false); }
  }
  return <article className="overflow-hidden rounded-3xl border border-border bg-white">
    <div className="p-5"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase text-brand-dark">{dateLabel(w.data_planejada)}</p><h3 className="mt-1 text-lg font-black">{w.nome}</h3><p className="mt-1 text-sm text-muted">{w.minutos_previstos ? `${w.minutos_previstos} min previstos · ` : ""}{w.distancia_prevista ? `${w.distancia_prevista} km · ` : ""}Esforço {w.esforco}</p></div>{record?.concluido && <CheckCircle2 className="shrink-0 text-brand-dark" aria-label="Treino concluído e salvo" />}</div>
      <div className="mt-4 space-y-3 text-sm leading-6"><p><b>Aquecimento:</b> {w.aquecimento}</p><p><b>Treino:</b> {w.principal}</p><p><b>Finalização:</b> {w.finalizacao}</p>{w.observacoes && <p className="rounded-xl bg-bg-alt p-3">{w.observacoes}</p>}</div>
      {record && <p className="mt-4 rounded-xl bg-brand-light p-3 text-sm"><b>{record.concluido ? "Concluído" : "Registro parcial"}</b> em {record.data_realizada.split("-").reverse().join("/")} · {record.distancia_km ?? "—"} km · {durationText(record.duracao_seg) || "—"} · Ritmo {pace(record.duracao_seg, record.distancia_km)}{record.rpe != null ? ` · Esforço ${record.rpe}/10` : ""}</p>}
      {!admin && <label className="mt-4 flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border border-brand/30 p-3 font-bold"><input type="checkbox" className="size-5 accent-green-600" checked={record?.concluido ?? false} disabled={saving} onChange={e => void save(e.target.checked)} /> {saving ? "Salvando…" : "Fiz este treino"}</label>}
      <button type="button" aria-expanded={open} onClick={() => setOpen(v => !v)} className="mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-ink-deep px-4 py-3 font-bold text-white"><Activity size={17} />{admin ? "Ver feedback e dados" : "Registrar tempo, esforço e feedback"}</button>
      {open && <form className="mt-5" onSubmit={e => { e.preventDefault(); void save(); }}><fieldset disabled={admin || saving} className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-bold">Data realizada<input type="date" max={today} required value={form.data_realizada} onChange={e => edit("data_realizada", e.target.value)} className={inputClass} /></label>
        <label className="text-sm font-bold">Tempo total (min:seg)<input placeholder="Ex.: 35:20 ou 1:10:30" inputMode="text" value={form.tempo} onChange={e => edit("tempo", e.target.value)} className={inputClass} /></label>
        <label className="text-sm font-bold">Distância (km)<input inputMode="decimal" placeholder="Ex.: 5,00" value={form.distancia_km} onChange={e => edit("distancia_km", e.target.value)} className={inputClass} /></label>
        <label className="text-sm font-bold">Esforço percebido (0–10)<select value={form.rpe} onChange={e => edit("rpe", e.target.value)} className={inputClass}><option value="">Não informado</option>{Array.from({ length: 11 }, (_, n) => <option key={n} value={n}>{n}{n === 0 ? " — repouso" : n === 3 ? " — leve" : n === 10 ? " — máximo" : ""}</option>)}</select></label>
        <label className="text-sm font-bold">Dor durante ou após (0–10)<select value={form.dor} onChange={e => edit("dor", e.target.value)} className={inputClass}><option value="">Não informado</option>{Array.from({ length: 11 }, (_, n) => <option key={n} value={n}>{n}{n === 0 ? " — sem dor" : ""}</option>)}</select></label>
        <label className="text-sm font-bold">Sono anterior (horas)<input inputMode="decimal" placeholder="Ex.: 6,5" value={form.sono_horas} onChange={e => edit("sono_horas", e.target.value)} className={inputClass} /></label>
        <label className="text-sm font-bold">FC média (bpm, opcional)<input inputMode="numeric" placeholder="Se houver no relógio" value={form.fc_media} onChange={e => edit("fc_media", e.target.value)} className={inputClass} /></label>
        <label className="text-sm font-bold">Onde correu<select value={form.terreno} onChange={e => edit("terreno", e.target.value)} className={inputClass}>{["", "Rua", "Esteira", "Pista", "Trilha"].map(t => <option key={t} value={t}>{t || "Não informado"}</option>)}</select></label>
        <label className="text-sm font-bold sm:col-span-2">Como foi? Feedback<textarea rows={4} maxLength={3000} value={form.feedback} onChange={e => edit("feedback", e.target.value)} className={inputClass} placeholder="Respiração, cansaço, pausas, desconforto, local da dor ou adaptação feita…" /></label>
      </fieldset>{!admin && <><p className="mt-3 text-xs leading-5 text-muted">Os dados são opcionais. Marcar “Fiz este treino” também salva o que estiver preenchido. Desmarcar preserva o registro e retira a conclusão.</p><button type="submit" disabled={saving} className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3 font-black text-ink-deep disabled:opacity-50"><Save size={18} />{saving ? "Salvando…" : "Salvar registro"}</button></>}</form>}
      {message && <p role="status" className={`mt-3 rounded-xl p-3 text-sm ${dirty ? "bg-amber-50 text-amber-900" : "bg-bg-alt"}`}>{message}</p>}
    </div>
  </article>;
}
