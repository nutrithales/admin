import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ClipboardList, FileText, Utensils, Dumbbell, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { BRAND_LOGO_DATA_URI } from "@/lib/brand-logo";
import { getPlanoAlimentarPacienteAtual } from "@/services/paciente-plano.queries";

export const metadata = { title: "Área do Paciente" };

export default async function PacienteDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/paciente/login");

  const sb = supabase as any;
  const [{ data: paciente }, plano] = await Promise.all([
    sb.from("pacientes").select("nome,treino_liberado").eq("auth_id", user.id).maybeSingle(),
    getPlanoAlimentarPacienteAtual(),
  ]);
  if (!paciente) redirect("/paciente/login?error=not-patient");

  const primeiroNome = paciente.nome?.split(" ")[0] ?? "";
  const treinoLiberado = Boolean(paciente.treino_liberado);

  return (
    <main className="min-h-screen bg-bg px-4 py-6 sm:py-10">
      <div className="mx-auto max-w-4xl">
        <header className="flex items-center justify-between gap-4">
          <Image src={BRAND_LOGO_DATA_URI} alt="Nutri Thales Rosa" width={138} height={48} className="h-auto w-[138px] object-contain" unoptimized priority />
          <span className="rounded-full bg-brand-light px-3 py-1.5 text-xs font-bold text-brand-dark">Área do paciente</span>
        </header>

        <section className="mt-8 rounded-[30px] bg-ink-deep p-6 text-white shadow-dark sm:p-8">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand">Bem-vindo{primeiroNome ? `, ${primeiroNome}` : ""}</p>
          <h1 className="mt-2 max-w-2xl text-3xl font-black leading-tight sm:text-4xl">Seu acompanhamento em um só lugar.</h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-white/65">Acesse seu plano alimentar, formulários, treinos e materiais do acompanhamento sempre que precisar.</p>
        </section>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <PortalCard
            href="/paciente/plano-alimentar"
            icon={<Utensils className="size-5" />}
            eyebrow="Nutrição"
            title="Plano Alimentar"
            description={plano ? "Consulte refeições, opções e substituições calculadas para o seu plano." : "Seu plano aparecerá aqui quando for liberado."}
            destaque={Boolean(plano)}
          />
          <PortalCard
            href="/paciente/pre-consulta"
            icon={<ClipboardList className="size-5" />}
            eyebrow="Consulta"
            title="Pré-consulta"
            description="Preencha ou revise as informações solicitadas antes do seu atendimento."
          />
          <PortalCard
            href="/paciente/treinos"
            icon={<Dumbbell className="size-5" />}
            eyebrow="Treinamento"
            title="Treinos"
            description={treinoLiberado ? "Acesse sua rotina, séries, repetições, RIR, intervalos e vídeos de execução." : "Seu treino aparecerá aqui quando for liberado pelo profissional."}
            destaque={treinoLiberado}
            disabled={!treinoLiberado}
          />
          <PortalCard
            href="#"
            icon={<FileText className="size-5" />}
            eyebrow="Conteúdo"
            title="Materiais"
            description="Biblioteca de materiais e conteúdos do seu acompanhamento."
            disabled
          />
        </div>
      </div>
    </main>
  );
}

function PortalCard({ href, icon, eyebrow, title, description, destaque, disabled }: { href: string; icon: React.ReactNode; eyebrow: string; title: string; description: string; destaque?: boolean; disabled?: boolean }) {
  const content = (
    <div className={`group flex h-full min-h-44 flex-col rounded-[24px] border p-5 shadow-card transition ${destaque ? "border-brand/40 bg-brand-light" : "border-border bg-surface"} ${disabled ? "opacity-55" : "hover:-translate-y-0.5 hover:shadow-image"}`}>
      <div className="flex items-start justify-between gap-3">
        <span className={`flex size-11 items-center justify-center rounded-2xl ${destaque ? "bg-brand text-ink-deep" : "bg-bg-alt text-brand-dark"}`}>{icon}</span>
        {!disabled && <ChevronRight className="size-5 text-muted transition group-hover:translate-x-0.5" />}
      </div>
      <p className="mt-5 text-xs font-bold uppercase tracking-[0.14em] text-brand-dark">{eyebrow}</p>
      <h2 className="mt-1 text-xl font-black text-ink">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-muted">{description}</p>
      {disabled && <p className="mt-auto pt-3 text-xs font-bold text-muted">Aguardando liberação</p>}
    </div>
  );

  return disabled ? content : <Link href={href}>{content}</Link>;
}
