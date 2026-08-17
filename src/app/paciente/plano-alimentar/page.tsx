import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { BRAND_LOGO_DATA_URI } from "@/lib/brand-logo";
import { getPlanoAlimentarPacienteAtual } from "@/services/paciente-plano.queries";
import { PlanoAlimentarPacienteClient } from "./PlanoAlimentarPacienteClient";

export const metadata = { title: "Plano Alimentar | Área do Paciente" };

export default async function PlanoAlimentarPacientePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/paciente/login");

  const plano = await getPlanoAlimentarPacienteAtual();

  return (
    <main className="min-h-screen bg-bg px-4 py-5 sm:py-8">
      <div className="mx-auto max-w-3xl">
        <header className="mb-5 flex items-center justify-between gap-4">
          <Link href="/paciente" className="inline-flex items-center gap-2 rounded-full bg-surface px-3 py-2 text-sm font-bold text-ink shadow-card">
            <ArrowLeft className="size-4" /> Voltar
          </Link>
          <Image src={BRAND_LOGO_DATA_URI} alt="Nutri Thales Rosa" width={118} height={42} className="h-auto w-[118px] object-contain" unoptimized priority />
        </header>

        {plano ? (
          <PlanoAlimentarPacienteClient plano={plano} />
        ) : (
          <section className="rounded-[28px] border border-border bg-surface p-7 text-center shadow-card">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-dark">Plano alimentar</p>
            <h1 className="mt-2 text-2xl font-black text-ink">Seu plano ainda não está disponível</h1>
            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted">Quando o seu plano alimentar for liberado, ele aparecerá aqui automaticamente.</p>
          </section>
        )}
      </div>
    </main>
  );
}
