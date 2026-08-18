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
    sb.from("pacientes").select("nome,plano,consultas_incluidas,consultas_realizadas_iniciais,treino_liberado").eq("auth_id", user.id).maybeSingle(),
    getPlanoAlimentarPacienteAtual(),
    sb.from("suplementacao_paciente").select("id,titulo,introducao,itens").eq("auth_id", user.id).eq("ativo", true).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    sb.from("consultas").select("data,tipo,modalidade,status").eq("auth_id", user.id).in("status", ["agendada", "confirmada"]).gte("data", agora).order("data", { ascending: true }).limit(1).maybeSingle(),
    sb.from("consultas").select("id", { count: "exact", head: true }).eq("auth_id", user.id).eq("status", "realizada"),
    sb.from("checkins").select("semana,status,respondido_em").eq("auth_id", user.id).order("semana", { ascending: false }).limit(1).maybeSingle(),
    sb.from("formularios_pre_consulta").select("id,status,solicitado_em").eq("auth_id", user.id).eq("status", "pendente").order("solicitado_em", { ascending: false }).limit(1).maybeSingle(),
    sb.from("paginas_paciente").select("titulo,url_pagina,icone,ordem").eq("user_id", user.id).eq("ativo", true).order("ordem", { ascending: true }),
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
  const progresso = consultasIncluidas ? Math.min(100, Math.round((totalRealizadas / consultasIncluidas) * 100)) : 0;

  return (
    <main className="min-h-screen bg-[#EDF2EE] sm:px-4 sm:py-8">
      <div className="mx-auto min-h-screen w-full max-w-[500px] bg-[#F7F9F7] pb-[calc(28px+env(safe-area-inset-bottom))] sm:min-h-0 sm:overflow-hidden sm:rounded-[32px] sm:border sm:border-black/[0.06] sm:shadow-[0_28px_80px_rgba(14,26,20,0.12)]">
        <header className="flex items-center justify-between px-5 pb-3 pt-[calc(18px+env(safe-area-inset-top))] sm:pt-6">
          <div className="flex items-center gap-3">
            <div className="flex size-12 items-center justify-center rounded-[15px] bg-white shadow-[0_8px_24px_rgba(14,26,20,0.08)] ring-1 ring-black/[0.05]">
              <Image src={BRAND_LOGO_DATA_URI} alt="Nutri Thales Rosa" width={46} height={40} className="h-auto max-h-9 w-auto max-w-[40px] object-contain" unoptimized priority />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#159F60]">Área do paciente</p>
              <p className="mt-0.5 text-[13px] font-bold text-[#6A766F]">Nutri Thales Rosa</p>
            </div>
          </div>
          <div className="grid size-10 place-items-center rounded-full bg-[#0E1A14] text-sm font-black text-white">
            {primeiroNome.charAt(0).toUpperCase()}
          </div>
        </header>

        <div className="px-5">
          <section className="pt-4">
            <p className="text-[13px] font-bold text-[#6B776F]">Bem-vindo de volta</p>
            <h1 className="mt-1 text-[34px] font-black leading-[1] tracking-[-0.045em] text-[#101713]">Olá, {primeiroNome}</h1>
            <p className="mt-3 max-w-[360px] text-[14px] leading-6 text-[#6F7B74]">Seu acompanhamento, seus materiais e seus próximos passos em um só lugar.</p>
          </section>

          {paciente.plano ? (
            <section className="mt-5 rounded-[22px] bg-[#0E1A14] p-5 text-white shadow-[0_16px_36px_rgba(14,26,20,0.14)]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#6FF0AC]">Seu acompanhamento</p>
                  <h2 className="mt-1.5 text-[20px] font-black tracking-[-0.02em]">{paciente.plano}</h2>
                </div>
                <span className="rounded-full bg-white/[0.08] px-2.5 py-1 text-[10px] font-bold text-white/70">
                  {consultasIncluidas ? `${Math.min(totalRealizadas, consultasIncluidas)}/${consultasIncluidas}` : "Ativo"}
                </span>
              </div>
              {consultasIncluidas ? (
                <>
                  <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full rounded-full bg-[#19DD7F]" style={{ width: `${progresso}%` }} />
                  </div>
                  <p className="mt-2 text-[11px] text-white/52">{Math.min(totalRealizadas, consultasIncluidas)} de {consultasIncluidas} consultas realizadas</p>
                </>
              ) : null}
            </section>
          ) : null}

          <section className="mt-5 rounded-[22px] border border-black/[0.05] bg-white p-4 shadow-[0_10px_30px_rgba(14,26,20,0.05)]">
            <div className="flex items-start gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-[13px] bg-[#EAF8F0] text-[#159F60]">
                <CalendarDays className="size-[18px]" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[#7B8780]">Próxima consulta</p>
                {proximaConsulta && consultaFormatada ? (
                  <>
                    <p className="mt-1.5 text-[16px] font-black leading-6 text-[#101713]">{consultaFormatada}</p>
                    {consultaMeta ? <p className="mt-1 text-[12px] text-[#79847E]">{consultaMeta}</p> : null}
                  </>
                ) : (
                  <>
                    <p className="mt-1.5 text-[15px] font-black text-[#101713]">Nenhuma consulta futura</p>
                    <p className="mt-1 text-[12px] leading-5 text-[#7D8882]">Quando houver um novo horário, ele aparecerá aqui.</p>
                  </>
                )}
              </div>
            </div>
          </section>

          <section className="mt-6">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-[17px] font-black tracking-[-0.02em] text-[#101713]">Acessos rápidos</h2>
              <span className="text-[11px] font-bold text-[#87928C]">Toque para abrir</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <QuickCard href="/paciente/plano-alimentar" icon={<Utensils className="size-[19px]" />} title="Plano alimentar" active={Boolean(plano)} status={plano ? "Disponível" : "Em breve"} />
              <QuickCard href="/paciente/treinos" icon={<Dumbbell className="size-[19px]" />} title="Treinos" active={treinoLiberado} status={treinoLiberado ? "Disponível" : "Em breve"} />
              {suplementacaoLiberada ? <QuickCard href="/paciente/suplementacao" icon={<Bolt className="size-[19px]" />} title="Suplementação" active status={`${totalSuplementos} ${totalSuplementos === 1 ? "item" : "itens"}`} /> : null}
              {preConsultaPendente ? <QuickCard href="/paciente/pre-consulta" icon={<ClipboardList className="size-[19px]" />} title="Pré-consulta" active status="Pendente" /> : null}
              {(paginas || []).map((pagina: any) => (
                <QuickCard key={`${pagina.titulo}-${pagina.ordem}`} href={pagina.url_pagina || "#"} icon={<FileText className="size-[19px]" />} title={pagina.titulo || "Material"} active={Boolean(pagina.url_pagina)} status="Material" external={Boolean(pagina.url_pagina?.startsWith("http"))} />
              ))}
            </div>
          </section>

          {suplementacaoLiberada ? (
            <Link href="/paciente/suplementacao" className="group mt-5 block">
              <section className="rounded-[22px] border border-[#CFEBDD] bg-[#ECF8F1] p-4 transition active:scale-[0.99]">
                <div className="flex items-center gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-[13px] bg-[#19DD7F] text-[#07120C]"><Bolt className="size-[18px]" /></span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[#159F60]">Suplementação ativa</p>
                    <p className="mt-1 truncate text-[14px] font-black text-[#101713]">{suplementacao.titulo || "Sua estratégia de suplementação"}</p>
                  </div>
                  <ArrowRight className="size-4 shrink-0 text-[#159F60] transition group-hover:translate-x-0.5" />
                </div>
              </section>
            </Link>
          ) : null}

          <div className="mt-5 grid gap-3">
            <section className="rounded-[20px] border border-black/[0.05] bg-white p-4">
              <div className="flex items-start gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-[12px] bg-[#F0F4F1] text-[#159F60]"><CheckCircle2 className="size-[17px]" /></span>
                <div>
                  <p className="text-[13px] font-black text-[#101713]">Check-in</p>
                  {ultimoCheckin ? (
                    <p className="mt-1 text-[12px] leading-5 text-[#7D8882]">{ultimoCheckin.respondido_em ? "Último check-in respondido" : "Seu último check-in está disponível"}{formatDataCurta(ultimoCheckin.semana) ? ` · ${formatDataCurta(ultimoCheckin.semana)}` : ""}</p>
                  ) : (
                    <p className="mt-1 text-[12px] leading-5 text-[#7D8882]">Nenhum check-in registrado ainda.</p>
                  )}
                </div>
              </div>
            </section>

            <section className="rounded-[20px] bg-[#101713] p-4 text-white">
              <div className="flex items-center gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-[12px] bg-white/[0.08] text-[#6FF0AC]"><MessageCircle className="size-[17px]" /></span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-black">Precisa de ajuda?</p>
                  <p className="mt-0.5 text-[11px] text-white/55">Fale com o consultório pelo WhatsApp.</p>
                </div>
                <a href="https://wa.me/5541987347625" target="_blank" rel="noopener noreferrer" className="rounded-full bg-[#19DD7F] px-3 py-2 text-[11px] font-black text-[#07120C]">Falar</a>
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}

function QuickCard({ href, icon, title, active, status, external }: { href: string; icon: React.ReactNode; title: string; active: boolean; status: string; external?: boolean }) {
  const content = (
    <div className={`group min-h-[126px] rounded-[20px] border p-4 transition active:scale-[0.985] ${active ? "border-black/[0.05] bg-white shadow-[0_8px_24px_rgba(14,26,20,0.045)]" : "border-black/[0.04] bg-[#F0F3F1] opacity-55"}`}>
      <div className="flex items-start justify-between gap-3">
        <span className={`flex size-10 items-center justify-center rounded-[13px] ${active ? "bg-[#EAF8F0] text-[#159F60]" : "bg-white/60 text-[#87928C]"}`}>{icon}</span>
        {active ? <ChevronRight className="size-4 text-[#A1ABA5] transition group-hover:translate-x-0.5" /> : null}
      </div>
      <div className="mt-4">
        <p className="text-[14px] font-black leading-5 text-[#101713]">{title}</p>
        <p className={`mt-1 text-[10px] font-bold uppercase tracking-[0.08em] ${active ? "text-[#159F60]" : "text-[#9AA39D]"}`}>{status}</p>
      </div>
    </div>
  );

  if (!active) return content;
  if (external) return <a href={href} target="_blank" rel="noopener noreferrer">{content}</a>;
  return <Link href={href}>{content}</Link>;
}
