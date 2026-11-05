"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, AlertCircle, Save, Activity, CalendarDays } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type RecordRow = {
  id?: string; data: string; evacuacoes: number; bristol: number | null;
  urgencia: boolean; episodios_urgencia: number; dor: number; distensao: number;
  refeicao_associada: string; observacoes: string;
};
const today = () => {
  const d = new Date();
  return [d.getFullYear(), String(d.getMonth()+1).padStart(2,"0"), String(d.getDate()).padStart(2,"0")].join("-");
};
const fresh = (): RecordRow => ({
  data: today(), evacuacoes: 1, bristol: 4, urgencia: false,
  episodios_urgencia: 0, dor: 0, distensao: 0,
  refeicao_associada: "nenhuma", observacoes: ""
});
const bristolDescriptions = [
  "1: bolinhas duras", "2: formato de salsicha, irregular",
  "3: salsicha com fissuras", "4: lisa e macia",
  "5: pedaços macios", "6: pastosa", "7: líquida"
];

export default function IntestinalTracker({ patientId, initialRecords }: {
  patientId: string; initialRecords: RecordRow[];
}) {
  const [records,setRecords] = useState<RecordRow[]>(initialRecords);
  const [form,setForm] = useState<RecordRow>(fresh);
  const [saving,setSaving] = useState(false);
  const [message,setMessage] = useState("");
  const [error,setError] = useState("");
  const change = <K extends keyof RecordRow>(key: K, value: RecordRow[K]) =>
    setForm(old => ({...old,[key]:value}));
  function loadDate(date: string) {
    const found = records.find(r=>r.data===date);
    setForm(found ? { ...found } : { ...fresh(), data: date });
    setMessage("");setError("");
  }
  async function save() {
    setSaving(true);setError("");setMessage("");
    try {
      if (!/^\\d{4}-\\d{2}-\\d{2}$/.test(form.data)) throw new Error("Escolha uma data válida.");
      const supabase = createClient();
      const payload = {
        paciente_id: patientId, data: form.data,
        evacuacoes: form.evacuacoes, bristol: form.evacuacoes === 0 ? null : form.bristol,
        urgencia: form.urgencia, episodios_urgencia: form.urgencia ? form.episodios_urgencia : 0,
        dor: form.dor, distensao: form.distensao,
        refeicao_associada: form.refeicao_associada, observacoes: form.observacoes.trim(),
        updated_at: new Date().toISOString()
      };
      const {data, error:dbError} = await (supabase as any)
        .from("acompanhamento_intestinal")
        .upsert(payload, { onConflict: "paciente_id,data" })
        .select("id,data,evacuacoes,bristol,urgencia,episodios_urgencia,dor,distensao,refeicao_associada,observacoes")
        .single();
      if(dbError) throw new Error(dbError.message);
      setRecords(old=>[data,...old.filter(r=>r.data!==data.data)].sort((a,b)=>b.data.localeCompare(a.data)).slice(0,60));
      setForm(data);setMessage("Registro salvo. Seu nutricionista poderá acompanhar sua evolução.");
    } catch(e) { setError(e instanceof Error ? e.message : "Não foi possível salvar."); }
    finally {setSaving(false);}
  }
  const field = "mt-1 w-full rounded-xl border border-[#DDE7DE] bg-white px-3 py-3 text-sm text-[#1A3024] outline-none focus:border-[#377A55]";
  const card = "rounded-2xl border border-[#E3EAE4] bg-white p-4 shadow-sm";
  const recent = records.slice(0,14);
  const urgencyCount = recent.filter(r=>r.urgencia).length;
  return (
    <main className="min-h-screen bg-[#F3F7F2] px-4 pb-16 pt-6 text-[#192D22]">
      <div className="mx-auto max-w-xl">
        <Link href="/paciente" className="inline-flex items-center gap-2 text-sm font-semibold text-[#37634B]"><ArrowLeft size={17}/> Voltar ao painel</Link>
        <div className="mt-6 mb-5">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#48765A]"><Activity size={15}/> Sua saúde intestinal</div>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight">Acompanhamento intestinal</h1>
          <p className="mt-2 text-sm leading-6 text-[#617568]">Registre uma vez ao dia, mesmo quando estiver bem. Isso ajuda a identificar padrões, não a julgar alimentos como bons ou ruins.</p>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className={card}><p className="text-xs text-[#607368]">Dias registrados</p><p className="text-2xl font-bold mt-1">{records.length}</p></div>
          <div className={card}><p className="text-xs text-[#607368]">Dias com urgência (últimos {recent.length || 0})</p><p className="text-2xl font-bold mt-1">{urgencyCount}</p></div>
        </div>
        <section className={card}>
          <h2 className="font-bold text-lg flex items-center gap-2"><CalendarDays size={18}/> Registro diário</h2>
          <label className="block mt-4 text-sm font-semibold">Data
            <input type="date" value={form.data} max={today()} onChange={e=>loadDate(e.target.value)} className={field} />
          </label>
          <label className="block mt-4 text-sm font-semibold">Quantas vezes evacuou?
            <select className={field} value={form.evacuacoes} onChange={e=>change("evacuacoes", Number(e.target.value))}>
              {Array.from({length:16},(_,i)=><option key={i} value={i}>{i}</option>)}
            </select>
          </label>
          <div className="mt-4">
            <label className="text-sm font-semibold block">Consistência das fezes (Escala de Bristol)</label>
            <p className="text-xs text-[#65796D] mt-1">Escolha o tipo mais frequente no dia.</p>
            <select disabled={form.evacuacoes===0} value={form.bristol ?? 4} className={field} onChange={e=>change("bristol",Number(e.target.value))}>
              {bristolDescriptions.map((d,i)=><option key={i} value={i+1}>{d}</option>)}
            </select>
          </div>
          <fieldset className="mt-5">
            <legend className="font-semibold text-sm">Teve urgência para evacuar?</legend>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {[false,true].map(v=><button key={String(v)} type="button" onClick={()=>setForm(f=>({...f,urgencia:v,episodios_urgencia:v?Math.max(1,f.episodios_urgencia):0}))} className={`rounded-xl border px-3 py-3 text-sm font-bold ${form.urgencia===v?"border-[#327C50] bg-[#E6F5E9] text-[#205B37]":"border-[#DCE6DE] bg-white"}`}>{v?"Sim":"Não"}</button>)}
            </div>
            {form.urgencia && <label className="block mt-3 text-sm font-semibold">Quantos episódios?
              <select className={field} value={form.episodios_urgencia} onChange={e=>change("episodios_urgencia",Number(e.target.value))}>
                {Array.from({length:15},(_,i)=><option key={i+1} value={i+1}>{i+1}</option>)}
              </select>
            </label>}
          </fieldset>
          {([["dor","Dor / cólicas"],["distensao","Inchaço / distensão"]] as const).map(([key,label])=><div className="mt-5" key={key}>
            <div className="flex justify-between text-sm font-semibold"><label htmlFor={key}>{label}</label><span>{form[key]}/10</span></div>
            <input id={key} type="range" min="0" max="10" value={form[key]} onChange={e=>change(key,Number(e.target.value))} className="mt-2 w-full accent-[#28784A]"/>
            <div className="flex justify-between text-[11px] text-[#718174]"><span>Sem sintomas</span><span>Muito intenso</span></div>
          </div>)}
          <label className="block mt-5 text-sm font-semibold">Percebeu alguma relação com uma refeição?
            <select className={field} value={form.refeicao_associada} onChange={e=>change("refeicao_associada",e.target.value)}>
              <option value="nenhuma">Não percebi relação</option><option value="cafe">Café da manhã</option>
              <option value="almoco">Almoço</option><option value="jantar">Jantar</option>
              <option value="incerto">Não tenho certeza</option>
            </select>
          </label>
          <label className="block mt-5 text-sm font-semibold">Observações (opcional)
            <textarea maxLength={2000} rows={3} className={field} value={form.observacoes ?? ""} onChange={e=>change("observacoes",e.target.value)} placeholder="Horário, alimentos diferentes, estresse ou outros fatores..."/>
          </label>
          {error && <p role="alert" className="mt-4 text-sm text-red-700 flex gap-2"><AlertCircle size={17}/>{error}</p>}
          {message && <p role="status" className="mt-4 text-sm text-green-800 flex gap-2"><CheckCircle2 size={17}/>{message}</p>}
          <button disabled={saving || !form.data || form.data>today()} onClick={save} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#173D29] px-4 py-3.5 font-bold text-white disabled:opacity-50"><Save size={18}/>{saving?"Salvando...":"Salvar registro"}</button>
        </section>
        <section className={`mt-5 ${card}`}>
          <h2 className="text-lg font-bold mb-3">Histórico recente</h2>
          {records.length===0 ? <p className="text-sm text-[#69796B]">Ainda não há registros. Comece pelo formulário acima.</p> :
            <div className="space-y-2">{records.slice(0,30).map(r=><button key={r.data} onClick={()=>{loadDate(r.data);window.scrollTo({top:0,behavior:"smooth"});}} className="w-full rounded-xl border border-[#E7ECE7] p-3 text-left hover:bg-[#F5FAF5]">
              <div className="flex items-center justify-between gap-2"><span className="font-semibold text-sm">{r.data.split("-").reverse().join("/")}</span><span className={`text-xs rounded-full px-2 py-1 ${r.urgencia?"bg-amber-100 text-amber-800":"bg-green-100 text-green-800"}`}>{r.urgencia?"Com urgência":"Sem urgência"}</span></div>
              <p className="text-xs text-[#617469] mt-1">{r.evacuacoes} evacuação(ões) · Bristol {r.bristol ?? "não se aplica"} · Dor {r.dor}/10</p>
            </button>)}</div>}
        </section>
        <p className="mt-5 text-xs leading-5 text-[#69796B]">Este registro não substitui avaliação médica. Sangue nas fezes, febre, desidratação, dor intensa ou piora importante exigem contato com profissional de saúde.</p>
      </div>
    </main>
  );
}
