"use client";

import { useEffect, useMemo, useState } from "react";
import { Dumbbell, Plus, Save, Trash2, Copy, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Input, Label, Textarea } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import { Select } from "@/components/ui/Select";
import { createClient } from "@/lib/supabase/client";

type Paciente = { id: string; nome: string | null; email: string | null; status: string | null };
type Treino = { id: string; paciente_id: string; nome: string; codigo: string | null; objetivo: string | null; bloco: string | null; ordem: number; status: string; observacoes: string | null };
type Exercicio = { id: string; treino_id: string; ordem: number; bloco_ordem: number; bloco_nome: string | null; nome: string; series: number; repeticoes: string | null; rir: string | null; rpe: string | null; descanso_seg: number | null; carga_inicial: number | null; video_url: string | null; observacoes: string | null };

const emptyWorkout = { nome: "", codigo: "", objetivo: "", bloco: "", observacoes: "" };
const emptyExercise = { nome: "", series: "3", repeticoes: "10", rir: "2", rpe: "", descanso_seg: "60", carga_inicial: "", video_url: "", observacoes: "" };

export default function TreinosPage() {
  const supabase = useMemo(() => createClient() as any, []);
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [pacienteId, setPacienteId] = useState("");
  const [treinos, setTreinos] = useState<Treino[]>([]);
  const [exercicios, setExercicios] = useState<Record<string, Exercicio[]>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [openWorkout, setOpenWorkout] = useState(true);
  const [form, setForm] = useState(emptyWorkout);
  const [exerciseForms, setExerciseForms] = useState<Record<string, typeof emptyExercise>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => { void loadPatients(); }, []);
  useEffect(() => { if (pacienteId) void loadWorkouts(pacienteId); else { setTreinos([]); setExercicios({}); } }, [pacienteId]);

  async function loadPatients() {
    setLoading(true);
    const { data, error } = await supabase.from("pacientes").select("id,nome,email,status").order("nome");
    setLoading(false);
    if (error) return alert("Não foi possível carregar os pacientes.");
    const rows = (data ?? []) as Paciente[];
    setPacientes(rows);
    if (!pacienteId && rows.length) setPacienteId(rows[0].id);
  }

  async function loadWorkouts(pid: string) {
    setLoading(true);
    const { data, error } = await supabase.from("treino_programas").select("*").eq("paciente_id", pid).order("ordem");
    if (error) { setLoading(false); return alert("Não foi possível carregar os treinos deste paciente."); }
    const rows = (data ?? []) as Treino[];
    setTreinos(rows);
    const ids = rows.map(r => r.id);
    if (!ids.length) { setExercicios({}); setLoading(false); return; }
    const ex = await supabase.from("treino_exercicios").select("*").in("treino_id", ids).order("ordem");
    setLoading(false);
    if (ex.error) return alert("Não foi possível carregar os exercícios.");
    const grouped: Record<string, Exercicio[]> = {};
    for (const item of (ex.data ?? []) as Exercicio[]) (grouped[item.treino_id] ||= []).push(item);
    setExercicios(grouped);
    setExpanded(Object.fromEntries(rows.map(r => [r.id, true])));
  }

  async function createWorkout() {
    if (!pacienteId || !form.nome.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("treino_programas").insert({
      paciente_id: pacienteId,
      nome: form.nome.trim(),
      codigo: form.codigo.trim() || null,
      objetivo: form.objetivo.trim() || null,
      bloco: form.bloco.trim() || null,
      observacoes: form.observacoes.trim() || null,
      ordem: treinos.length + 1,
      status: "ativo",
    });
    setSaving(false);
    if (error) return alert(`Não foi possível criar o treino: ${error.message}`);
    setForm(emptyWorkout);
    setOpenWorkout(false);
    await loadWorkouts(pacienteId);
  }

  async function updateWorkout(t: Treino, patch: Partial<Treino>) {
    const { error } = await supabase.from("treino_programas").update(patch).eq("id", t.id);
    if (error) return alert("Não foi possível atualizar o treino.");
    setTreinos(prev => prev.map(x => x.id === t.id ? { ...x, ...patch } : x));
  }

  async function removeWorkout(t: Treino) {
    if (!confirm(`Arquivar ${t.nome}? O histórico já realizado será mantido.`)) return;
    await updateWorkout(t, { status: "arquivado" });
  }

  async function duplicateWorkout(t: Treino) {
    setSaving(true);
    const { data: nt, error } = await supabase.from("treino_programas").insert({
      paciente_id: t.paciente_id,
      nome: `${t.nome} · Cópia`, codigo: t.codigo, objetivo: t.objetivo, bloco: t.bloco,
      observacoes: t.observacoes, ordem: treinos.length + 1, status: "ativo",
    }).select("id").single();
    if (error || !nt) { setSaving(false); return alert("Não foi possível duplicar o treino."); }
    const list = exercicios[t.id] ?? [];
    if (list.length) {
      const payload = list.map((e, i) => ({ treino_id: nt.id, bloco_ordem: e.bloco_ordem ?? 1, bloco_nome: e.bloco_nome, ordem: i + 1, nome: e.nome, series: e.series, repeticoes: e.repeticoes, rir: e.rir, rpe: e.rpe, descanso_seg: e.descanso_seg, carga_inicial: e.carga_inicial, video_url: e.video_url, observacoes: e.observacoes }));
      await supabase.from("treino_exercicios").insert(payload);
    }
    setSaving(false);
    await loadWorkouts(pacienteId);
  }

  function exForm(tid: string) { return exerciseForms[tid] ?? emptyExercise; }
  function setExForm(tid: string, patch: Partial<typeof emptyExercise>) { setExerciseForms(prev => ({ ...prev, [tid]: { ...exForm(tid), ...patch } })); }

  async function addExercise(tid: string) {
    const f = exForm(tid);
    if (!f.nome.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("treino_exercicios").insert({
      treino_id: tid, bloco_ordem: 1, bloco_nome: "Principal", ordem: (exercicios[tid]?.length ?? 0) + 1,
      nome: f.nome.trim(), series: Number(f.series || 1), repeticoes: f.repeticoes || null,
      rir: f.rir || null, rpe: f.rpe || null, descanso_seg: f.descanso_seg ? Number(f.descanso_seg) : null,
      carga_inicial: f.carga_inicial ? Number(f.carga_inicial) : null, video_url: f.video_url || null,
      observacoes: f.observacoes || null,
    });
    setSaving(false);
    if (error) return alert(`Não foi possível adicionar o exercício: ${error.message}`);
    setExerciseForms(prev => ({ ...prev, [tid]: emptyExercise }));
    await loadWorkouts(pacienteId);
  }

  async function updateExercise(e: Exercicio, patch: Partial<Exercicio>) {
    const { error } = await supabase.from("treino_exercicios").update(patch).eq("id", e.id);
    if (error) return alert("Não foi possível atualizar o exercício.");
    setExercicios(prev => ({ ...prev, [e.treino_id]: (prev[e.treino_id] ?? []).map(x => x.id === e.id ? { ...x, ...patch } : x) }));
  }

  async function removeExercise(e: Exercicio) {
    if (!confirm(`Remover ${e.nome} deste treino?`)) return;
    const { error } = await supabase.from("treino_exercicios").delete().eq("id", e.id);
    if (error) return alert("Não foi possível remover o exercício.");
    setExercicios(prev => ({ ...prev, [e.treino_id]: (prev[e.treino_id] ?? []).filter(x => x.id !== e.id) }));
  }

  const paciente = pacientes.find(p => p.id === pacienteId);
  const active = treinos.filter(t => t.status !== "arquivado");

  return <div>
    <PageHeader title="Treinos" description="Prescreva, edite e acompanhe os treinos dos pacientes no mesmo painel administrativo." actions={<Button onClick={() => setOpenWorkout(v => !v)}><Plus className="size-4" /> Novo treino</Button>} />

    <Card className="mb-5"><CardContent className="pt-6"><div className="grid gap-4 lg:grid-cols-[1.4fr_.6fr]"><div><Label>Paciente</Label><Select value={pacienteId} onChange={e => setPacienteId(e.target.value)}><option value="">Selecione...</option>{pacientes.map(p => <option key={p.id} value={p.id}>{p.nome ?? p.email ?? "Paciente"}</option>)}</Select></div><div className="rounded-xl bg-bg-alt p-3"><p className="text-xs text-muted">Treinos ativos</p><p className="text-2xl font-bold">{active.length}</p></div></div>{paciente && <p className="mt-3 text-xs text-muted">{paciente.nome}{paciente.email ? ` · ${paciente.email}` : ""}</p>}</CardContent></Card>

    {openWorkout && <Card className="mb-5"><CardContent className="pt-6"><h2 className="mb-4 font-bold">Novo treino</h2><div className="grid gap-4 md:grid-cols-2"><div><Label>Nome *</Label><Input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} placeholder="Treino A · Inferiores" /></div><div><Label>Código</Label><Input value={form.codigo} onChange={e => setForm({ ...form, codigo: e.target.value })} placeholder="A" /></div><div><Label>Objetivo</Label><Input value={form.objetivo} onChange={e => setForm({ ...form, objetivo: e.target.value })} placeholder="Hipertrofia, força..." /></div><div><Label>Bloco</Label><Input value={form.bloco} onChange={e => setForm({ ...form, bloco: e.target.value })} placeholder="Bloco 1 · Base" /></div></div><div className="mt-4"><Label>Observações</Label><Textarea value={form.observacoes} onChange={e => setForm({ ...form, observacoes: e.target.value })} /></div><div className="mt-4 flex justify-end"><Button disabled={saving || !pacienteId || !form.nome.trim()} onClick={() => void createWorkout()}><Save className="size-4" /> {saving ? "Salvando..." : "Criar treino"}</Button></div></CardContent></Card>}

    {loading && <Card><CardContent className="py-12 text-center text-sm text-muted">Carregando treinos...</CardContent></Card>}
    {!loading && pacienteId && !active.length && <Card><CardContent className="py-12 text-center"><Dumbbell className="mx-auto mb-3 size-8 text-muted" /><p className="font-semibold">Nenhum treino ativo</p><p className="mt-1 text-sm text-muted">Crie o primeiro treino para este paciente.</p></CardContent></Card>}

    <div className="space-y-4">{active.map(t => <Card key={t.id}><CardContent className="pt-6"><div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-start"><div className="min-w-0"><div className="flex items-center gap-2"><Dumbbell className="size-5 text-brand-dark" /><Input className="max-w-xl font-bold" value={t.nome} onChange={e => setTreinos(prev => prev.map(x => x.id === t.id ? { ...x, nome: e.target.value } : x))} onBlur={e => void updateWorkout(t, { nome: e.target.value })} /></div><p className="mt-2 text-sm text-muted">{t.codigo ? `${t.codigo} · ` : ""}{t.objetivo || "Sem objetivo descrito"}{t.bloco ? ` · ${t.bloco}` : ""}</p></div><div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => void duplicateWorkout(t)}><Copy className="size-4" /> Duplicar</Button><Button variant="outline" onClick={() => setExpanded(prev => ({ ...prev, [t.id]: !prev[t.id] }))}>{expanded[t.id] ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />} {expanded[t.id] ? "Recolher" : "Abrir"}</Button><Button variant="outline" onClick={() => void removeWorkout(t)}><Trash2 className="size-4" /> Arquivar</Button></div></div>

      {expanded[t.id] && <div className="mt-5"><div className="space-y-3">{(exercicios[t.id] ?? []).map((e, idx) => <div key={e.id} className="rounded-xl border border-border bg-bg-alt p-4"><div className="mb-3 flex items-center justify-between gap-3"><strong>{idx + 1}. {e.nome}</strong><button className="text-muted hover:text-red-600" onClick={() => void removeExercise(e)} title="Remover exercício"><Trash2 className="size-4" /></button></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6"><div className="lg:col-span-2"><Label>Exercício</Label><Input value={e.nome} onChange={ev => setExercicios(prev => ({ ...prev, [t.id]: (prev[t.id] ?? []).map(x => x.id === e.id ? { ...x, nome: ev.target.value } : x) }))} onBlur={ev => void updateExercise(e, { nome: ev.target.value })} /></div><div><Label>Séries</Label><Input type="number" value={e.series} onChange={ev => void updateExercise(e, { series: Number(ev.target.value) })} /></div><div><Label>Repetições</Label><Input value={e.repeticoes ?? ""} onChange={ev => void updateExercise(e, { repeticoes: ev.target.value })} /></div><div><Label>RIR</Label><Input value={e.rir ?? ""} onChange={ev => void updateExercise(e, { rir: ev.target.value })} /></div><div><Label>Descanso (s)</Label><Input type="number" value={e.descanso_seg ?? ""} onChange={ev => void updateExercise(e, { descanso_seg: ev.target.value ? Number(ev.target.value) : null })} /></div></div><div className="mt-3 grid gap-3 lg:grid-cols-2"><div><Label>Vídeo</Label><Input value={e.video_url ?? ""} onChange={ev => setExercicios(prev => ({ ...prev, [t.id]: (prev[t.id] ?? []).map(x => x.id === e.id ? { ...x, video_url: ev.target.value } : x) }))} onBlur={ev => void updateExercise(e, { video_url: ev.target.value || null })} /></div><div><Label>Orientações</Label><Input value={e.observacoes ?? ""} onChange={ev => setExercicios(prev => ({ ...prev, [t.id]: (prev[t.id] ?? []).map(x => x.id === e.id ? { ...x, observacoes: ev.target.value } : x) }))} onBlur={ev => void updateExercise(e, { observacoes: ev.target.value || null })} /></div></div></div>)}</div>

        <div className="mt-4 rounded-xl border border-dashed border-border p-4"><p className="mb-3 text-sm font-semibold">Adicionar exercício</p><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6"><div className="lg:col-span-2"><Label>Exercício *</Label><Input value={exForm(t.id).nome} onChange={e => setExForm(t.id, { nome: e.target.value })} placeholder="Nome do exercício" /></div><div><Label>Séries</Label><Input type="number" value={exForm(t.id).series} onChange={e => setExForm(t.id, { series: e.target.value })} /></div><div><Label>Repetições</Label><Input value={exForm(t.id).repeticoes} onChange={e => setExForm(t.id, { repeticoes: e.target.value })} /></div><div><Label>RIR</Label><Input value={exForm(t.id).rir} onChange={e => setExForm(t.id, { rir: e.target.value })} /></div><div><Label>Descanso (s)</Label><Input type="number" value={exForm(t.id).descanso_seg} onChange={e => setExForm(t.id, { descanso_seg: e.target.value })} /></div></div><div className="mt-3 grid gap-3 lg:grid-cols-2"><div><Label>Vídeo</Label><Input value={exForm(t.id).video_url} onChange={e => setExForm(t.id, { video_url: e.target.value })} /></div><div><Label>Orientações</Label><Input value={exForm(t.id).observacoes} onChange={e => setExForm(t.id, { observacoes: e.target.value })} /></div></div><div className="mt-3 flex justify-end"><Button disabled={saving || !exForm(t.id).nome.trim()} onClick={() => void addExercise(t.id)}><Plus className="size-4" /> Adicionar exercício</Button></div></div>
      </div>}
    </CardContent></Card>)}</div>
  </div>;
}
