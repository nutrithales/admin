import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Dumbbell, ExternalLink, Timer, Video } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { BRAND_LOGO_DATA_URI } from "@/lib/brand-logo";

export const metadata = { title: "Meus Treinos" };

const VINICIUS_PATIENT_ID = "20c469e7-43c6-41c3-9f19-b5704ced772b";
const VINICIUS_DASHBOARD_URL = "https://www.nutrithales.com.br/paciente/treinos/vinicius";

type Treino = {
  id: string;
  nome: string;
  codigo: string | null;
  objetivo: string | null;
  bloco: string | null;
  ordem: number;
  observacoes: string | null;
};

type Exercicio = {
  id: string;
  treino_id: string;
  ordem: number;
  nome: string;
  series: number;
  repeticoes: string | null;
  rir: string | null;
  rpe: string | null;
  descanso_seg: number | null;
  video_url: string | null;
  observacoes: string | null;
};

export default async function PacienteTreinosPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/paciente/login");

  const sb = supabase as any;
  const { data: paciente } = await sb
    .from("pacientes")
    .select("id,nome,treino_liberado")
    .eq("auth_id", user.id)
    .maybeSingle();

  if (!paciente) redirect("/paciente/login?error=not-patient");
  if (!paciente.treino_liberado) redirect("/paciente");

  if (paciente.id === VINICIUS_PATIENT_ID) {
    redirect(VINICIUS_DASHBOARD_URL);
  }

  const { data: treinoData } = await sb
    .from("treino_programas")
    .select("id,nome,codigo,objetivo,bloco,ordem,observacoes")
    .eq("paciente_id", paciente.id)
    .eq("status", "ativo")
    .order("ordem");

  const treinos = (treinoData ?? []) as Treino[];
  const treinoIds = treinos.map((t) => t.id);
  let exercicios: Exercicio[] = [];

  if (treinoIds.length) {
    const { data } = await sb
      .from("treino_exercicios")
      .select("id,treino_id,ordem,nome,series,repeticoes,rir,rpe,descanso_seg,video_url,observacoes")
      .in("treino_id", treinoIds)
      .order("ordem");
    exercicios = (data ?? []) as Exercicio[];
  }

  const porTreino = new Map<string, Exercicio[]>();
  for (const exercicio of exercicios) {
    const lista = porTreino.get(exercicio.treino_id) ?? [];
    lista.push(exercicio);
    porTreino.set(exercicio.treino_id, lista);
  }

  return (
    <main className="min-h-screen bg-bg px-4 py-6 sm:py-10">
      <div className="mx-auto max-w-5xl">
        <header className="flex items-center justify-between gap-4">
          <Image src={BRAND_LOGO_DATA_URI} alt="Nutri Thales Rosa" width={138} height={48} className="h-auto w-[138px] object-contain" unoptimized priority />
          <Link href="/paciente" className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-sm font-bold text-ink">
            <ArrowLeft className="size-4" /> Voltar
          </Link>
        </header>

        <section className="mt-8 rounded-[30px] bg-ink-deep p-6 text-white shadow-dark sm:p-8">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand">Treinamento</p>
          <h1 className="mt-2 text-3xl font-black leading-tight sm:text-4xl">Seus treinos</h1>
          <p className="mt-3 text-sm leading-6 text-white/65">Séries, repetições, RIR, intervalos, orientações e vídeos em um só lugar.</p>
        </section>

        {treinos.length === 0 ? (
          <div className="mt-6 rounded-[24px] border border-border bg-surface p-8 text-center text-sm text-muted">Nenhum treino ativo liberado no momento.</div>
        ) : (
          <div className="mt-6 space-y-6">
            {treinos.map((treino) => (
              <section key={treino.id} className="overflow-hidden rounded-[24px] border border-border bg-surface">
                <div className="border-b border-border bg-bg-alt p-5 sm:p-6">
                  <div className="flex items-start gap-3">
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-brand-light text-brand-dark"><Dumbbell className="size-5" /></span>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.12em] text-brand-dark">{treino.codigo ?? "Treino"}</p>
                      <h2 className="mt-1 text-xl font-black text-ink">{treino.nome}</h2>
                      <p className="mt-1 text-sm text-muted">{[treino.objetivo, treino.bloco].filter(Boolean).join(" · ")}</p>
                    </div>
                  </div>
                </div>

                <div className="divide-y divide-border">
                  {(porTreino.get(treino.id) ?? []).map((exercicio, index) => (
                    <article key={exercicio.id} className="p-5 sm:p-6">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-brand-dark">EXERCÍCIO {index + 1}</p>
                          <h3 className="mt-1 text-lg font-black text-ink">{exercicio.nome}</h3>
                          <div className="mt-3 flex flex-wrap gap-2 text-sm">
                            <span className="rounded-full bg-bg-alt px-3 py-1.5 font-semibold text-ink">{exercicio.series} séries</span>
                            {exercicio.repeticoes && <span className="rounded-full bg-bg-alt px-3 py-1.5 font-semibold text-ink">{exercicio.repeticoes} reps</span>}
                            {exercicio.rir && <span className="rounded-full bg-bg-alt px-3 py-1.5 font-semibold text-ink">RIR {exercicio.rir}</span>}
                            {exercicio.rpe && <span className="rounded-full bg-bg-alt px-3 py-1.5 font-semibold text-ink">RPE {exercicio.rpe}</span>}
                            {exercicio.descanso_seg != null && <span className="inline-flex items-center gap-1 rounded-full bg-bg-alt px-3 py-1.5 font-semibold text-ink"><Timer className="size-3.5" /> {exercicio.descanso_seg}s</span>}
                          </div>
                          {exercicio.observacoes && <p className="mt-4 max-w-3xl whitespace-pre-line text-sm leading-6 text-muted">{exercicio.observacoes}</p>}
                        </div>
                        {exercicio.video_url && (
                          <a href={exercicio.video_url} target="_blank" rel="noreferrer" className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-black text-ink-deep">
                            <Video className="size-4" /> Ver execução <ExternalLink className="size-3.5" />
                          </a>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
