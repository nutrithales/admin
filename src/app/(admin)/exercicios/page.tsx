"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Dumbbell, ExternalLink, Pencil, Plus, Search, Trash2, Video } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Input, Label, Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/ui/PageHeader";
import { Select } from "@/components/ui/Select";
import { createClient } from "@/lib/supabase/client";

type Exercicio = {
  id: string; nome: string; slug: string | null; aliases: string[]; categoria: string | null;
  grupo_muscular_principal: string | null; grupos_musculares_secundarios: string[]; padrao_movimento: string | null;
  equipamento: string | null; nivel: string | null; unilateral: boolean; instrucoes: string | null;
  dicas_execucao: string | null; erros_comuns: string | null; observacoes: string | null;
  youtube_url: string | null; youtube_video_id: string | null; youtube_titulo: string | null; youtube_canal: string | null;
  youtube_thumbnail_url: string | null; video_verificado: boolean; ativo: boolean;
};

const emptyForm = {
  nome: "", aliases: "", categoria: "Musculação", grupo_muscular_principal: "", grupos_musculares_secundarios: "",
  padrao_movimento: "", equipamento: "", nivel: "Intermediário", unilateral: false, instrucoes: "", dicas_execucao: "",
  erros_comuns: "", observacoes: "", youtube_url: "", youtube_titulo: "", youtube_canal: "", video_verificado: false, ativo: true,
};

function youtubeId(url: string) {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) return u.pathname.replace("/", "").split("/")[0] || null;
    if (u.pathname.startsWith("/shorts/")) return u.pathname.split("/")[2] || null;
    if (u.pathname.startsWith("/embed/")) return u.pathname.split("/")[2] || null;
    return u.searchParams.get("v");
  } catch { return null; }
}

export default function ExerciciosPage() {
  const supabase = useMemo(() => createClient() as any, []);
  const [rows, setRows] = useState<Exercicio[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [musculo, setMusculo] = useState("");
  const [equipamento, setEquipamento] = useState("");
  const [video, setVideo] = useState("todos");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Exercicio | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => { void load(); }, []);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase.from("exercicios_biblioteca").select("*").order("nome");
    setLoading(false);
    if (error) return alert(`Não foi possível carregar os exercícios: ${error.message}`);
    setRows((data ?? []) as Exercicio[]);
  }

  const musculos = Array.from(new Set(rows.map(r => r.grupo_muscular_principal).filter(Boolean) as string[])).sort();
  const equipamentos = Array.from(new Set(rows.map(r => r.equipamento).filter(Boolean) as string[])).sort();
  const filtered = rows.filter(r => {
    const q = search.trim().toLowerCase();
    const text = [r.nome, ...(r.aliases ?? []), r.grupo_muscular_principal, r.equipamento].filter(Boolean).join(" ").toLowerCase();
    return (!q || text.includes(q)) && (!musculo || r.grupo_muscular_principal === musculo) && (!equipamento || r.equipamento === equipamento) &&
      (video === "todos" || (video === "verificado" ? r.video_verificado : video === "com" ? !!r.youtube_url : !r.youtube_url));
  });

  function startNew() { setEditing(null); setForm(emptyForm); setOpen(true); }
  function edit(r: Exercicio) {
    setEditing(r);
    setForm({
      nome: r.nome, aliases: (r.aliases ?? []).join(", "), categoria: r.categoria ?? "", grupo_muscular_principal: r.grupo_muscular_principal ?? "",
      grupos_musculares_secundarios: (r.grupos_musculares_secundarios ?? []).join(", "), padrao_movimento: r.padrao_movimento ?? "",
      equipamento: r.equipamento ?? "", nivel: r.nivel ?? "", unilateral: r.unilateral, instrucoes: r.instrucoes ?? "",
      dicas_execucao: r.dicas_execucao ?? "", erros_comuns: r.erros_comuns ?? "", observacoes: r.observacoes ?? "",
      youtube_url: r.youtube_url ?? "", youtube_titulo: r.youtube_titulo ?? "", youtube_canal: r.youtube_canal ?? "",
      video_verificado: r.video_verificado, ativo: r.ativo,
    });
    setOpen(true);
  }

  async function save() {
    if (!form.nome.trim()) return;
    setSaving(true);
    const vid = youtubeId(form.youtube_url.trim());
    const payload = {
      nome: form.nome.trim(), aliases: form.aliases.split(",").map(x => x.trim()).filter(Boolean), categoria: form.categoria || null,
      grupo_muscular_principal: form.grupo_muscular_principal || null,
      grupos_musculares_secundarios: form.grupos_musculares_secundarios.split(",").map(x => x.trim()).filter(Boolean),
      padrao_movimento: form.padrao_movimento || null, equipamento: form.equipamento || null, nivel: form.nivel || null,
      unilateral: form.unilateral, instrucoes: form.instrucoes || null, dicas_execucao: form.dicas_execucao || null,
      erros_comuns: form.erros_comuns || null, observacoes: form.observacoes || null, youtube_url: form.youtube_url.trim() || null,
      youtube_video_id: vid, youtube_titulo: form.youtube_titulo || null, youtube_canal: form.youtube_canal || null,
      youtube_thumbnail_url: vid ? `https://img.youtube.com/vi/${vid}/hqdefault.jpg` : null,
      video_verificado: form.video_verificado, video_verificado_em: form.video_verificado ? new Date().toISOString() : null, ativo: form.ativo,
    };
    const result = editing ? await supabase.from("exercicios_biblioteca").update(payload).eq("id", editing.id) : await supabase.from("exercicios_biblioteca").insert(payload);
    setSaving(false);
    if (result.error) return alert(`Não foi possível salvar: ${result.error.message}`);
    setOpen(false); await load();
  }

  async function archive(r: Exercicio) {
    if (!confirm(`${r.ativo ? "Desativar" : "Reativar"} ${r.nome}?`)) return;
    const { error } = await supabase.from("exercicios_biblioteca").update({ ativo: !r.ativo }).eq("id", r.id);
    if (error) return alert("Não foi possível atualizar o exercício.");
    await load();
  }

  return <div>
    <PageHeader title="Exercícios" description="Biblioteca central de exercícios, orientações técnicas e vídeos para prescrição dos treinos." actions={<Button onClick={startNew}><Plus className="size-4" /> Novo exercício</Button>} />

    <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Card><CardContent className="pt-6"><p className="text-xs text-muted">Total</p><p className="text-2xl font-bold">{rows.length}</p></CardContent></Card>
      <Card><CardContent className="pt-6"><p className="text-xs text-muted">Ativos</p><p className="text-2xl font-bold">{rows.filter(r => r.ativo).length}</p></CardContent></Card>
      <Card><CardContent className="pt-6"><p className="text-xs text-muted">Com vídeo</p><p className="text-2xl font-bold">{rows.filter(r => r.youtube_url).length}</p></CardContent></Card>
      <Card><CardContent className="pt-6"><p className="text-xs text-muted">Vídeos verificados</p><p className="text-2xl font-bold">{rows.filter(r => r.video_verificado).length}</p></CardContent></Card>
    </div>

    <Card className="mb-5"><CardContent className="pt-6"><div className="grid gap-3 md:grid-cols-4">
      <div className="md:col-span-2"><Label>Buscar</Label><div className="relative"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted"/><Input className="pl-9" value={search} onChange={e => setSearch(e.target.value)} placeholder="Nome, alias, músculo ou equipamento..."/></div></div>
      <div><Label>Grupo muscular</Label><Select value={musculo} onChange={e => setMusculo(e.target.value)}><option value="">Todos</option>{musculos.map(x => <option key={x}>{x}</option>)}</Select></div>
      <div><Label>Vídeo</Label><Select value={video} onChange={e => setVideo(e.target.value)}><option value="todos">Todos</option><option value="verificado">Verificados</option><option value="com">Com vídeo</option><option value="sem">Sem vídeo</option></Select></div>
      <div><Label>Equipamento</Label><Select value={equipamento} onChange={e => setEquipamento(e.target.value)}><option value="">Todos</option>{equipamentos.map(x => <option key={x}>{x}</option>)}</Select></div>
    </div></CardContent></Card>

    {loading ? <Card><CardContent className="py-12 text-center text-sm text-muted">Carregando exercícios...</CardContent></Card> :
    <div className="space-y-3">{filtered.map(r => <Card key={r.id} className={!r.ativo ? "opacity-60" : ""}><CardContent className="pt-6"><div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex min-w-0 gap-4">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-bg-alt"><Dumbbell className="size-5 text-brand-dark"/></div>
        <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="font-bold">{r.nome}</h3>{r.video_verificado && <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-1 text-[11px] font-bold text-green-700"><CheckCircle2 className="size-3"/> Vídeo verificado</span>}{!r.ativo && <span className="rounded-full bg-bg-alt px-2 py-1 text-[11px] text-muted">Inativo</span>}</div>
        <p className="mt-1 text-sm text-muted">{[r.grupo_muscular_principal,r.equipamento,r.padrao_movimento,r.nivel].filter(Boolean).join(" · ") || "Sem classificação"}</p>
        {r.youtube_url && <a className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-brand-dark hover:underline" href={r.youtube_url} target="_blank" rel="noreferrer"><Video className="size-4"/> {r.youtube_titulo || "Ver vídeo"}{r.youtube_canal ? ` · ${r.youtube_canal}` : ""}<ExternalLink className="size-3"/></a>}</div>
      </div>
      <div className="flex shrink-0 gap-2"><Button variant="outline" onClick={() => edit(r)}><Pencil className="size-4"/> Editar</Button><Button variant="outline" onClick={() => void archive(r)}><Trash2 className="size-4"/> {r.ativo ? "Desativar" : "Reativar"}</Button></div>
    </div></CardContent></Card>)}{!filtered.length && <Card><CardContent className="py-12 text-center text-sm text-muted">Nenhum exercício encontrado.</CardContent></Card>}</div>}

    <Modal open={open} onClose={() => setOpen(false)} title={editing ? "Editar exercício" : "Novo exercício"} description="Cadastre a referência técnica e associe um vídeo do YouTube."><div className="space-y-4">
      <div><Label>Nome *</Label><Input value={form.nome} onChange={e => setForm({...form,nome:e.target.value})} placeholder="Ex.: Agachamento livre com barra"/></div>
      <div><Label>Aliases</Label><Input value={form.aliases} onChange={e => setForm({...form,aliases:e.target.value})} placeholder="Separados por vírgula"/></div>
      <div className="grid gap-4 sm:grid-cols-2"><div><Label>Grupo muscular principal</Label><Input value={form.grupo_muscular_principal} onChange={e => setForm({...form,grupo_muscular_principal:e.target.value})}/></div><div><Label>Secundários</Label><Input value={form.grupos_musculares_secundarios} onChange={e => setForm({...form,grupos_musculares_secundarios:e.target.value})} placeholder="Glúteos, posteriores..."/></div></div>
      <div className="grid gap-4 sm:grid-cols-3"><div><Label>Equipamento</Label><Input value={form.equipamento} onChange={e => setForm({...form,equipamento:e.target.value})}/></div><div><Label>Padrão de movimento</Label><Input value={form.padrao_movimento} onChange={e => setForm({...form,padrao_movimento:e.target.value})}/></div><div><Label>Nível</Label><Select value={form.nivel} onChange={e => setForm({...form,nivel:e.target.value})}><option>Iniciante</option><option>Intermediário</option><option>Avançado</option></Select></div></div>
      <div><Label>Instruções</Label><Textarea value={form.instrucoes} onChange={e => setForm({...form,instrucoes:e.target.value})}/></div>
      <div><Label>Dicas de execução</Label><Textarea value={form.dicas_execucao} onChange={e => setForm({...form,dicas_execucao:e.target.value})}/></div>
      <div><Label>Erros comuns</Label><Textarea value={form.erros_comuns} onChange={e => setForm({...form,erros_comuns:e.target.value})}/></div>
      <div className="rounded-xl border border-border p-4"><h3 className="mb-3 flex items-center gap-2 font-bold"><Video className="size-4"/> YouTube</h3><div className="space-y-3"><div><Label>URL do vídeo</Label><Input value={form.youtube_url} onChange={e => setForm({...form,youtube_url:e.target.value,video_verificado:false})} placeholder="https://www.youtube.com/watch?v=..."/></div><div className="grid gap-3 sm:grid-cols-2"><div><Label>Título</Label><Input value={form.youtube_titulo} onChange={e => setForm({...form,youtube_titulo:e.target.value})}/></div><div><Label>Canal</Label><Input value={form.youtube_canal} onChange={e => setForm({...form,youtube_canal:e.target.value})}/></div></div><label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={form.video_verificado} onChange={e => setForm({...form,video_verificado:e.target.checked})}/> Vídeo conferido e adequado para o aluno</label></div></div>
      <div className="flex flex-wrap gap-5"><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.unilateral} onChange={e => setForm({...form,unilateral:e.target.checked})}/> Exercício unilateral</label><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.ativo} onChange={e => setForm({...form,ativo:e.target.checked})}/> Ativo</label></div>
      <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button disabled={saving || !form.nome.trim()} onClick={() => void save()}>{saving ? "Salvando..." : "Salvar exercício"}</Button></div>
    </div></Modal>
  </div>;
}
