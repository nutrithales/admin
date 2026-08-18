import Link from "next/link";
import { redirect } from "next/navigation";
import {
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
import { getPlanoAlimentarPacienteAtual } from "@/services/paciente-plano.queries";
import { PatientLogoutButton } from "./logout-button";

const BRAND_LOGO = "https://www.nutrithales.com.br/assets/logo-thales.png";

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
    <main className="min-h-screen bg-[#EEF2EF] sm:px-4 sm:py-8">
      <div className="mx-auto min-h-screen w-full max-w-[500px] bg-[#F8FAF8] pb-[calc(24px+env(safe-area-inset-bottom))] sm:min-h-0 sm:overflow-hidden sm:rounded-[32px] sm:border sm:border-black/[0.055] sm:shadow-[0_30px_90px_rgba(14,26,20,0.12)]">
        <header className="flex items-center justify-between px-5 pt-[calc(14px+env(safe-area-inset-top))] sm:pt-6">
          <img src={BRAND_LOGO} alt="Nutri Thales Rosa" className="h-auto w-[84px] object-contain" />
          <div className="flex items-center gap-2">
            <PatientLogoutButton />
            <div className="grid size-9 place-items-center rounded-full bg-[#0E1A14] text-[12px] font-black text-white shadow-[0_6px_18px_rgba(14,26,20,0.12)]">
              {primeiroNome.charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        <div className="px-5">
          <section className="pb-1 pt-6">
            <h1 className="text-[32px] font-black leading-[0.98] tracking-[-0.043em] text-[#101713]">Olá, {primeiroNome}</h1>
            <p className="mt-2 max-w-[330px] text-[13px] leading-5 text-[#748078]">Seus recursos e próximos passos estão aqui.</p>
          </section>

          <section className="mt-4 overflow-hidden rounded-[23px] bg-[#0E1A14] text-white shadow-[0_16px_34px_rgba(14,26,20,0.14)]">
            <div className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[9px] font-black uppercase tracking-[0.13em] text-[#6FF0AC]">Acompanhamento</p>
                  <h2 className="mt-1 truncate text-[18px] font-black tracking-[-0.02em]">{paciente.plano || "Ativo"}</h2>
                </div>
                <span className="shrink-0 rounded-full bg-white/[0.08] px-2.5 py-1 text-[9px] font-bold text-white/68">
                  {consultasIncluidas ? `${Math.min(totalRealizadas, consultasIncluidas)}/${consultasIncluidas}` : "Ativo"}
                </span>
              </div>

              {consultasIncluidas ? (
                <>
                  <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full rounded-full bg-[#19DD7F]" style={{ width: `${progresso}%` }} />
                  </div>
                  <p className="mt-1.5 text-[10px] text-white/48">{Math.min(totalRealizadas, consultasIncluidas)} de {consultasIncluidas} consultas realizadas</p>
                </>
              ) : null}
            </div>

            <div className="border-t border-white/[0.08] bg-white/[0.035] px-4 py-3.5">
              <div className="flex items-center gap-3">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-[11px] bg-white/[0.07] text-[#6FF0AC]">
                  <CalendarDays className="size-[16px]" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[9px] font-black uppercase tracking-[0.11em] text-white/44">Próxima consulta</p>
                  {proximaConsulta && consultaFormatada ? (
                    <>
                      <p className="mt-0.5 text-[13px] font-black leading-5 text-white">{consultaFormatada}</p>
                      {consultaMeta ? <p className="mt-0.5 text-[10px] text-white/45">{consultaMeta}</p> : null}
                    </>
                  ) : (
                    <p className="mt-0.5 text-[12px] font-bold text-white/72">Nenhuma consulta futura agendada</p>
                  )}
                </div>
              </div>
            </div>
          </section>

          <section className="mt-6">
            <div className="mb-3 flex items-end justify-between gap-3">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.12em] text-[#87928C]">Seus recursos</p>
                <h2 className="mt-0.5 text-[18px] font-black tracking-[-0.025em] text-[#101713]">Acessos rápidos</h2>
              </div>
              <span className="pb-0.5 text-[9px] font-bold text-[#9AA39D]">Toque para abrir</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <QuickCard href="/paciente/plano-alimentar" icon={<Utensils className="size-[18px]" />} title="Plano alimentar" active={Boolean(plano)} status={plano ? "Disponível" : "Em breve"} />
              <QuickCard href="/paciente/treinos" icon={<Dumbbell className="size-[18px]" />} title="Treinos" active={treinoLiberado} status={treinoLiberado ? "Disponível" : "Em breve"} />
              {suplementacaoLiberada ? <QuickCard href="/paciente/suplementacao" icon={<Bolt className="size-[18px]" />} title="Suplementação" active status={`${totalSuplementos} ${totalSuplementos === 1 ? "item" : "itens"}`} /> : null}
              {preConsultaPendente ? <QuickCard href="/paciente/pre-consulta" icon={<ClipboardList className="size-[18px]" />} title="Pré-consulta" active status="Pendente" /> : null}
              {(paginas || []).map((pagina: any) => (
                <QuickCard key={`${pagina.titulo}-${pagina.ordem}`} href={pagina.url_pagina || "#"} icon={<FileText className="size-[18px]" />} title={pagina.titulo || "Material"} active={Boolean(pagina.url_pagina)} status="Material" external={Boolean(pagina.url_pagina?.startsWith("http"))} />
              ))}
            </div>
          </section>

          <section className="mt-6">
            <p className="text-[9px] font-black uppercase tracking-[0.12em] text-[#87928C]">Acompanhamento contínuo</p>
            <div className="mt-3 grid gap-3">
              <div className="rounded-[18px] border border-black/[0.05] bg-white p-3.5 shadow-[0_6px_18px_rgba(14,26,20,0.03)]">
                <div className="flex items-start gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-[12px] bg-[#EDF7F1] text-[#159F60]"><CheckCircle2 className="size-[17px]" /></span>
                  <div className="min-w-0">
                    <p className="text-[13px] font-black text-[#101713]">Check-in</p>
                    {ultimoCheckin ? (
                      <p className="mt-0.5 text-[11px] leading-4 text-[#7D8882]">{ultimoCheckin.respondido_em ? "Último check-in respondido" : "Seu último check-in está disponível"}{formatDataCurta(ultimoCheckin.semana) ? ` · ${formatDataCurta(ultimoCheckin.semana)}` : ""}</p>
                    ) : (
                      <p className="mt-0.5 text-[11px] leading-4 text-[#7D8882]">Quando houver um novo check-in, ele aparecerá aqui.</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="rounded-[18px] border border-black/[0.05] bg-white p-3.5 shadow-[0_6px_18px_rgba(14,26,20,0.03)]">
                <div className="flex items-center gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-[12px] bg-[#EDF7F1] text-[#159F60]"><MessageCircle className="size-[17px]" /></span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-black text-[#101713]">Precisa de ajuda?</p>
                    <p className="mt-0.5 text-[11px] leading-4 text-[#7D8882]">Fale com o consultório pelo WhatsApp.</p>
                  </div>
                  <a href="https://wa.me/5541987347625" target="_blank" rel="noopener noreferrer" className="self-center rounded-full bg-[#0E1A14] px-3.5 py-2 text-[11px] font-black text-white">Falar</a>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

function QuickCard({ href, icon, title, active, status, external }: { href: string; icon: React.ReactNode; title: string; active: boolean; status: string; external?: boolean }) {
  const content = (
    <div className={`group min-h-[106px] rounded-[19px] border p-3.5 transition active:scale-[0.985] ${active ? "border-black/[0.055] bg-white shadow-[0_8px_22px_rgba(14,26,20,0.04)]" : "border-[#E0E6E2] bg-[#F5F7F5]"}`}>
      <div className="flex items-start justify-between gap-3">
        <span className={`flex size-9 items-center justify-center rounded-[12px] ${active ? "bg-[#EAF8F0] text-[#159F60]" : "bg-white text-[#7F8B84] ring-1 ring-[#E3E8E4]"}`}>{icon}</span>
        {active ? <ChevronRight className="size-4 text-[#A2ACA6] transition group-hover:translate-x-0.5" /> : <span className="rounded-full bg-white px-2 py-1 text-[8px] font-black uppercase tracking-[0.08em] text-[#87928C] ring-1 ring-[#E3E8E4]">Em breve</span>}
      </div>
      <div className="mt-3">
        <p className={`text-[13px] font-black leading-5 ${active ? "text-[#101713]" : "text-[#5F6B64]"}`}>{title}</p>
        {active ? <p className="mt-0.5 text-[9px] font-bold uppercase tracking-[0.07em] text-[#159F60]">{status}</p> : null}
      </div>
    </div>
  );

  if (!active) return content;
  if (external) return <a href={href} target="_blank" rel="noopener noreferrer">{content}</a>;
  return <Link href={href}>{content}</Link>;
}
