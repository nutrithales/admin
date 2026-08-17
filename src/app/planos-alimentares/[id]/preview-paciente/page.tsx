import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Eye } from "lucide-react";
import { BRAND_LOGO_DATA_URI } from "@/lib/brand-logo";
import { getPlanoAlimentarDashboardPorId } from "@/services/paciente-plano.queries";
import { PlanoAlimentarPacienteClient } from "@/app/paciente/plano-alimentar/PlanoAlimentarPacienteClient";

export const metadata = { title: "Prévia do paciente | Plano alimentar" };

export default async function PreviewPacientePlanoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const plano = await getPlanoAlimentarDashboardPorId(id);
  if (!plano) notFound();

  return (
    <main className="min-h-screen bg-bg px-4 py-5 sm:py-8">
      <div className="mx-auto max-w-3xl">
        <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Link href={`/planos-alimentares/${id}`} className="inline-flex items-center gap-2 rounded-full bg-surface px-3 py-2 text-sm font-bold text-ink shadow-card">
              <ArrowLeft className="size-4" /> Voltar ao editor
            </Link>
            <span className="inline-flex items-center gap-2 rounded-full bg-brand-light px-3 py-2 text-xs font-bold uppercase tracking-[0.12em] text-brand-dark">
              <Eye className="size-4" /> Visão do paciente
            </span>
          </div>
          <Image src={BRAND_LOGO_DATA_URI} alt="Nutri Thales Rosa" width={118} height={42} className="h-auto w-[118px] object-contain" unoptimized priority />
        </header>

        <div className="mb-4 rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-muted shadow-card">
          Prévia administrativa do plano de <strong className="text-ink">{plano.pacienteNome}</strong>. Esta página exige acesso administrativo e reproduz a experiência do paciente.
        </div>

        <PlanoAlimentarPacienteClient plano={plano} />
      </div>
    </main>
  );
}
