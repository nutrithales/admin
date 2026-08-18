"use client";

import { useEffect, useMemo, useState } from "react";
import { Dumbbell, ExternalLink, Timer, Video } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { createClient } from "@/lib/supabase/client";

type Treino = { id:string; nome:string; codigo:string|null; objetivo:string|null; bloco:string|null; ordem:number; status:string };
type Exercicio = { id:string; treino_id:string; ordem:number; nome:string; series:number; repeticoes:string|null; rir:string|null; rpe:string|null; descanso_seg:number|null; video_url:string|null; observacoes:string|null };

export function TreinosTab({ pacienteId }: { pacienteId: string }) {
  const sb = useMemo(() => createClient() as any, []);
  const [treinos, setTreinos] = useState<Treino[]>([]);
  const [exercicios, setExercicios] = useState<Record<string,Exercicio[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => { void carregar(); }, [pacienteId]);

  async function carregar() {
    setLoading(true);
    const t = await sb.from("treino_programas").select("id,nome,codigo,objetivo,bloco,ordem,status").eq("paciente_id", pacienteId).order("ordem");
    if (t.error) { setLoading(false); return; }
    const rows = (t.data ?? []) as Treino[];
    setTreinos(rows);
    const ids = rows.map((x) => x.id);
    if (!ids.length) { setExercicios({}); setLoading(false); return; }
    const e = await sb.from("treino_exercicios").select("id,treino_id,ordem,nome,series,repeticoes,rir,rpe,descanso_seg,video_url,observacoes").in("treino_id", ids).order("ordem");
    const grouped: Record<string,Exercicio[]> = {};
    for (const row of (e.data ?? []) as Exercicio[]) (grouped[row.treino_id] ??= []).push(row);
    setExercicios(grouped);
    setLoading(false);
  }

  const ativos = treinos.filter((t) => t.status === "ativo");

  if (loading) return <Card><CardContent className="py-10 text-center text-sm text-muted">Carregando treinos...</CardContent></Card>;
  if (!treinos.length) return <Card><CardContent className="py-10 text-center text-sm text-muted">Nenhum treino cadastrado para este paciente.</CardContent></Card>;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-base font-bold text-ink">Treinos cadastrados</h2>
        <p className="text-sm text-muted">Visualização da prescrição atual e dos exercícios vinculados ao paciente.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card><CardContent className="pt-6"><p className="text-xs font-semibold text-muted">Programas</p><p className="mt-1 text-2xl font-bold text-ink">{treinos.length}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-xs font-semibold text-muted">Ativos</p><p className="mt-1 text-2xl font-bold text-ink">{ativos.length}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-xs font-semibold text-muted">Exercícios ativos</p><p className="mt-1 text-2xl font-bold text-ink">{ativos.reduce((acc,t)=>acc+(exercicios[t.id]?.length??0),0)}</p></CardContent></Card>
      </div>

      {treinos.map((treino) => (
        <Card key={treino.id} className={treino.status !== "ativo" ? "opacity-60" : ""}>
          <CardContent className="pt-6">
            <div className="mb-4 flex items-start gap-3">
              <div className="rounded-full bg-brand-light p-3 text-brand-dark"><Dumbbell className="size-5" /></div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-bold text-ink">{treino.nome}</h3>
                  <span className="rounded-full bg-bg-alt px-2 py-1 text-xs font-semibold text-muted">{treino.status}</span>
                </div>
                <p className="mt-1 text-sm text-muted">{[treino.codigo, treino.objetivo, treino.bloco].filter(Boolean).join(" · ")}</p>
              </div>
            </div>

            <div className="space-y-3">
              {(exercicios[treino.id] ?? []).map((exercicio, index) => (
                <div key={exercicio.id} className="rounded-xl border border-border bg-bg-alt p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <p className="text-sm font-bold text-ink">{index + 1}. {exercicio.nome}</p>
                      <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted">
                        <span>{exercicio.series} séries</span>
                        {exercicio.repeticoes && <span>· {exercicio.repeticoes} reps</span>}
                        {exercicio.rir && <span>· RIR {exercicio.rir}</span>}
                        {exercicio.rpe && <span>· RPE {exercicio.rpe}</span>}
                        {exercicio.descanso_seg != null && <span className="inline-flex items-center gap-1">· <Timer className="size-3" /> {exercicio.descanso_seg}s</span>}
                      </div>
                      {exercicio.observacoes && <p className="mt-2 whitespace-pre-line text-sm leading-6 text-muted">{exercicio.observacoes}</p>}
                    </div>
                    {exercicio.video_url && <a className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-brand-dark hover:underline" href={exercicio.video_url} target="_blank" rel="noreferrer"><Video className="size-4" /> Vídeo <ExternalLink className="size-3" /></a>}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
