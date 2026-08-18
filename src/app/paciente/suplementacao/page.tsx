import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, BatteryCharging, Bolt, Droplets, Info, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Suplementação" };

type Suplemento = {
  ordem?: number;
  nome: string;
  marca?: string;
  categoria?: string;
  formato?: string;
  sabores?: string[];
  funcao?: string;
  orientacao?: string;
};

function IconeCategoria({ categoria = "" }: { categoria?: string }) {
  const texto = categoria.toLowerCase();
  if (texto.includes("eletról")) return <Droplets className="size-5" />;
  if (texto.includes("energia") || texto.includes("pré")) return <Bolt className="size-5" />;
  if (texto.includes("recuper")) return <BatteryCharging className="size-5" />;
  return <Info className="size-5" />;
}

export default async function SuplementacaoPacientePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/paciente/login");

  const { data } = await (supabase as any)
    .from("suplementacao_paciente")
    .select("titulo,introducao,itens,observacoes,ativo")
    .eq("auth_id", user.id)
    .eq("ativo", true)
    .maybeSingle();

  if (!data) redirect("/paciente");

  const itens = Array.isArray(data.itens)
    ? (data.itens as Suplemento[]).slice().sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0))
    : [];

  return (
    <main className="min-h-screen bg-bg px-4 py-5 sm:py-9">
      <div className="mx-auto max-w-3xl">
        <Link href="/paciente" className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border bg-white px-4 text-sm font-black text-ink shadow-card transition hover:border-brand/50 hover:bg-brand-light">
          <ArrowLeft className="size-4" /> Área do paciente
        </Link>

        <section className="mt-4 overflow-hidden rounded-[28px] bg-ink-deep p-5 text-white shadow-dark sm:p-7">
          <div className="flex items-start gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-brand text-ink-deep"><Bolt className="size-5" /></span>
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-brand">Corrida</p>
              <h1 className="mt-1 text-2xl font-black leading-tight sm:text-3xl">{data.titulo}</h1>
            </div>
          </div>
          {data.introducao && <p className="mt-4 max-w-2xl text-sm leading-6 text-white/70">{data.introducao}</p>}
        </section>

        <section className="mt-4 grid gap-3 sm:grid-cols-2">
          {itens.map((item, index) => (
            <article key={`${item.nome}-${index}`} className="rounded-[22px] border border-border/80 bg-surface p-4 shadow-card sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-light text-brand-dark">
                  <IconeCategoria categoria={item.categoria} />
                </span>
                {item.formato && <span className="rounded-full bg-bg-alt px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.1em] text-muted">{item.formato}</span>}
              </div>

              <p className="mt-4 text-[10px] font-black uppercase tracking-[0.14em] text-brand-dark">{item.categoria ?? "Suplemento"}</p>
              <h2 className="mt-1 text-lg font-black leading-tight text-ink">{item.nome}</h2>
              {item.marca && <p className="mt-1 text-xs font-bold text-muted">{item.marca}</p>}

              {item.sabores && item.sabores.length > 0 && (
                <p className="mt-3 text-xs leading-5 text-muted"><span className="font-black text-ink">Sabores que você utiliza:</span> {item.sabores.join(", ")}</p>
              )}

              {item.funcao && (
                <div className="mt-4 rounded-2xl bg-bg-alt-2 p-3.5">
                  <p className="text-[10px] font-black uppercase tracking-[0.12em] text-muted">Para que entra na estratégia</p>
                  <p className="mt-1.5 text-sm leading-5 text-ink">{item.funcao}</p>
                </div>
              )}

              {item.orientacao && (
                <div className="mt-3 flex gap-2.5 rounded-2xl border border-brand/20 bg-brand-light/60 p-3.5">
                  <Info className="mt-0.5 size-4 shrink-0 text-brand-dark" />
                  <p className="text-sm leading-5 text-ink">{item.orientacao}</p>
                </div>
              )}
            </article>
          ))}
        </section>

        {data.observacoes && (
          <section className="mt-4 rounded-[22px] border border-border/80 bg-surface p-4 shadow-card sm:p-5">
            <div className="flex items-center gap-2 text-brand-dark"><ShieldCheck className="size-5" /><p className="text-[11px] font-black uppercase tracking-[0.14em]">Estratégia individual</p></div>
            <p className="mt-3 text-sm leading-6 text-ink">{data.observacoes}</p>
          </section>
        )}
      </div>
    </main>
  );
}
