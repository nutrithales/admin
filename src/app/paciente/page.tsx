import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  Bolt,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Dumbbell,
  FileText,
  MessageCircle,
  Utensils,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { BRAND_LOGO_DATA_URI } from "@/lib/brand-logo";
import { getPlanoAlimentarPacienteAtual } from "@/services/paciente-plano.queries";

export const metadata = {
  title: "Área do Paciente | Nutri Thales Rosa",
  description: "Seu acompanhamento nutricional em um só lugar.",
};

function formatConsulta(data: string | null) {
  if (!data) return null;
  const date = new Date(data);
  if (Number.isNaN(date.getTime())) return null;
  const dia = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  }).format(date);
  const hora = new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
  return `${dia} · ${hora}`;
}

function formatDataCurta(data: string | null) {
  if (!data) return null;
  const value = data.length <= 10 ? `${data}T12:00:00` : data;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "long" }).format(date);
}

export default async function PacienteDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/paciente/login");

  const sb = supabase as any;
  const agora = new Date().toISOString();

  const [
    { data: paciente },
    plano,
    { data: suplementacao },
    { data: proximaConsulta },
    { count: consultasRealizadas },
    { data: ultimoCheckin },
    { data: preConsulta },
    { data: paginas },
  ] = await Promise.all([
    sb
      .from("pacientes")
      .select("nome,plano,consultas_incluidas,consultas_realizadas_iniciais,treino_liberado")
      .eq("auth_id", user.id)
      .maybeSingle(),
    getPlanoAlimentarPacienteAtual(),
    sb
      .from("suplementacao_paciente")
      .select("id,titulo,introducao,itens")
      .eq("auth_id", user.id)
      .eq("ativo", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    sb
      .from("consultas")
      .select("data,tipo,modalidade,status")
      .eq("auth_id", user.id)
      .in("status", ["agendada", "confirmada"])
      .gte("data", agora)
      .order("data", { ascending: true })
      .limit(1)
      .maybeSingle(),
    sb
      .from("consultas")
      .select("id", { count: "exact", head: true })
      .eq("auth_id", user.id)
      .eq("status", "realizada"),
    sb
      .from("checkins")
      .select("semana,status,respondido_em")
      .eq("auth_id", user.id)
      .order("semana", { ascending: false })
      .limit(1)
      .maybeSingle(),
    sb
      .from("formularios_pre_consulta")
      .select("id,status,solicitado_em")
      .eq("auth_id", user.id)
      .eq("status", "pendente")
      .order("solicitado_em", { ascending: false })
      .limit(1)
      .maybeSingle(),
    sb
      .from("paginas_paciente")
      .select("titulo,url_pagina,icone,ordem")
      .eq("user_id", user.id)
      .eq("ativo", true)
      .order("ordem", { ascending: true }),
  ]);

  if (!paciente) redirect("/paciente/login?error=not-patient");

  const primeiroNome = paciente.nome?.split(" ")[0] ?? "Paciente";
  const treinoLiberado = Boolean(paciente.treino_liberado);
  const suplementacaoLiberada = Boolean(suplementacao);
  const preConsultaPendente = Boolean(preConsulta);
  const totalSuplementos = Array.isArray(suplementacao?.itens) ? suplementacao.itens.length : 0;
  const consultaFormatada = formatConsulta(proximaConsulta?.data ?? null);
  const consultaMeta = [proximaConsulta?.tipo, proximaConsulta?.modalidade].filter(Boolean).join(" · ");

  const consultasIncluidas = Math.max(0, Number(paciente.consultas_incluidas) || 0);
  const consultasIniciais = Math.max(0, Number(paciente.consultas_realizadas_iniciais) || 0);
  const totalRealizadas = Math.max(0, Number(consultasRealizadas || 0) + consultasIniciais);
  const progresso = consultasIncluidas
    ? Math.min(100, Math.round((totalRealizadas / consultasIncluidas) * 100))
    : 0;

  return (
    <main className="min-h-screen bg-bg px-4 py-6 sm:py-10">
      <div className="mx-auto max-w-[980px]">
        <header className="flex items-center justify-between gap-4">
          <Image
            src={BRAND_LOGO_DATA_URI}
            alt="Nutri Thales Rosa"
            width={138}
            height={48}
            className="h-auto w-[138px] object-contain"
            unoptimized
            priority
          />
          <span className="rounded-full bg-brand-light px-3 py-1.5 text-xs font-bold text-brand-dark">
            Área do paciente
          </span>
        </header>

        <section className="mt-8">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-brand-dark">Área do paciente</p>
          <h1 className="mt-2 text-4xl font-black tracking-tight text-ink sm:text-5xl">Olá, {primeiroNome}</h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-muted">
            Seu acompanhamento está aqui. Acesse seus materiais e veja os próximos passos.
          </p>
        </section>

        {suplementacaoLiberada ? (
          <Link href="/paciente/suplementacao" className="group mt-6 block">
            <section className="overflow-hidden rounded-[26px] border border-brand/40 bg-brand-light shadow-card transition group-hover:-translate-y-0.5 group-hover:shadow-image">
              <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
                <div className="flex min-w-0 items-start gap-4">
                  <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-brand text-ink-deep">
                    <Bolt className="size-6" />
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-xs font-black uppercase tracking-[0.14em] text-brand-dark">Suplementação ativa</p>
                      <span className="rounded-full bg-white/80 px-2.5 py-1 text-[11px] font-bold text-brand-dark">
                        {totalSuplementos} {totalSuplementos === 1 ? "item" : "itens"}
                      </span>
                    </div>
                    <h2 className="mt-1 text-xl font-black text-ink sm:text-2xl">
                      {suplementacao.titulo || "Sua estratégia de suplementação"}
                    </h2>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
                      {suplementacao.introducao || "Consulte os suplementos liberados e as orientações da sua estratégia atual."}
                    </p>
                  </div>
                </div>
                <span className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-ink-deep px-4 text-sm font-black text-white transition group-hover:gap-3">
                  Ver suplementação <ArrowRight className="size-4" />
                </span>
              </div>
            </section>
          </Link>
        ) : null}

        <div className="mt-6 grid gap-4 lg:grid-cols-[1.35fr_.65fr]">
          <div className="grid gap-4">
            <section className="rounded-[22px] border border-border bg-surface p-5 shadow-card sm:p-6">
              <div className="mb-4 flex items-center gap-2 text-xs font-black uppercase tracking-[0.12em] text-muted">
                <CalendarDays className="size-4 text-brand-dark" /> Próxima consulta
              </div>
              {proximaConsulta && consultaFormatada ? (
                <>
                  <p className="text-xl font-black tracking-tight text-ink sm:text-2xl">{consultaFormatada}</p>
                  {consultaMeta ? <p className="mt-2 text-sm text-muted">{consultaMeta}</p> : null}
                  <span className="mt-4 inline-flex items-center gap-2 rounded-full bg-brand-light px-3 py-1.5 text-xs font-black text-brand-dark">
                    <span className="size-2 rounded-full bg-brand" /> Agendada
                  </span>
                </>
              ) : (
                <p className="rounded-xl border border-dashed border-border p-4 text-sm leading-6 text-muted">
                  Nenhuma consulta futura agendada. Quando uma nova consulta for marcada, ela aparecerá aqui.
                </p>
              )}
            </section>

            <section className="rounded-[22px] border border-border bg-surface p-5 shadow-card sm:p-6">
              <h2 className="text-base font-black text-ink">Acessos rápidos</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <QuickCard
                  href="/paciente/plano-alimentar"
                  icon={<Utensils className="size-5" />}
                  title="Plano Alimentar"
                  active={Boolean(plano)}
                  description={plano ? "Refeições, opções e substituições do seu plano atual." : "Aguardando liberação."}
                />
                {suplementacaoLiberada ? (
                  <QuickCard
                    href="/paciente/suplementacao"
                    icon={<Bolt className="size-5" />}
                    title="Suplementação"
                    active
                    description="Estratégia e orientações de uso liberadas."
                  />
                ) : null}
                {preConsultaPendente ? (
                  <QuickCard
                    href="/paciente/pre-consulta"
                    icon={<ClipboardList className="size-5" />}
                    title="Pré-consulta"
                    active
                    description="Você tem informações pendentes para preencher antes do atendimento."
                  />
                ) : null}
                <QuickCard
                  href="/paciente/treinos"
                  icon={<Dumbbell className="size-5" />}
                  title="Treinos"
                  active={treinoLiberado}
                  description={treinoLiberado ? "Sua rotina de treinamento liberada." : "Aguardando liberação."}
                />
                {(paginas || []).map((pagina: any) => (
                  <QuickCard
                    key={`${pagina.titulo}-${pagina.ordem}`}
                    href={pagina.url_pagina || "#"}
                    icon={<FileText className="size-5" />}
                    title={pagina.titulo || "Material"}
                    active={Boolean(pagina.url_pagina)}
                    description="Material liberado no seu acompanhamento."
                    external={Boolean(pagina.url_pagina?.startsWith("http"))}
                  />
                ))}
              </div>
            </section>
          </div>

          <div className="grid content-start gap-4">
            {paciente.plano ? (
              <section className="rounded-[22px] border border-border bg-surface p-5 shadow-card sm:p-6">
                <p className="text-xs font-black uppercase tracking-[0.12em] text-muted">Seu acompanhamento</p>
                <div className="mt-3 flex items-end justify-between gap-3">
                  <p className="text-lg font-black text-ink">{paciente.plano}</p>
                  <p className="shrink-0 text-right text-xs font-bold text-muted">
                    {consultasIncluidas ? `${Math.min(totalRealizadas, consultasIncluidas)} de ${consultasIncluidas} consultas` : "Acompanhamento ativo"}
                  </p>
                </div>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-bg-alt">
                  <div className="h-full rounded-full bg-brand" style={{ width: `${progresso}%` }} />
                </div>
              </section>
            ) : null}

            <section className="rounded-[22px] border border-border bg-surface p-5 shadow-card sm:p-6">
              <div className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-[0.12em] text-muted">
                <CheckCircle2 className="size-4 text-brand-dark" /> Check-in
              </div>
              {ultimoCheckin ? (
                <>
                  <p className="text-base font-black leading-6 text-ink">
                    {ultimoCheckin.respondido_em ? "Último check-in respondido" : "Seu último check-in está disponível"}
                  </p>
                  <p className="mt-2 text-sm text-muted">
                    {[formatDataCurta(ultimoCheckin.semana), ultimoCheckin.status].filter(Boolean).join(" · ")}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-base font-black text-ink">Nenhum check-in registrado ainda</p>
                  <p className="mt-2 text-sm leading-6 text-muted">Quando houver um novo check-in, ele aparecerá aqui.</p>
                </>
              )}
            </section>

            <section className="rounded-[22px] border border-border bg-surface p-5 shadow-card sm:p-6">
              <div className="flex items-start gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-bg-alt text-brand-dark">
                  <MessageCircle className="size-5" />
                </span>
                <div>
                  <h2 className="text-base font-black text-ink">Precisa falar com o consultório?</h2>
                  <p className="mt-1 text-sm leading-6 text-muted">Use o WhatsApp para dúvidas de atendimento e organização do acompanhamento.</p>
                </div>
              </div>
              <a
                href="https://wa.me/5541987347625"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-full bg-ink-deep px-4 text-sm font-black text-white"
              >
                Falar no WhatsApp
              </a>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}

function QuickCard({
  href,
  icon,
  title,
  description,
  active,
  external,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  active: boolean;
  external?: boolean;
}) {
  const content = (
    <div
      className={`group flex min-h-[116px] flex-col justify-between rounded-2xl border p-4 transition ${
        active
          ? "border-border bg-white hover:-translate-y-0.5 hover:border-brand/60 hover:shadow-card"
          : "border-border bg-bg-alt opacity-55"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="flex size-9 items-center justify-center rounded-xl bg-brand-light text-brand-dark">{icon}</span>
        {active ? <ChevronRight className="size-4 text-brand-dark transition group-hover:translate-x-0.5" /> : null}
      </div>
      <div className="mt-3">
        <p className="text-sm font-black text-ink">{title}</p>
        <p className="mt-1 text-xs leading-5 text-muted">{description}</p>
      </div>
    </div>
  );

  if (!active) return content;
  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer">
        {content}
      </a>
    );
  }
  return <Link href={href}>{content}</Link>;
}