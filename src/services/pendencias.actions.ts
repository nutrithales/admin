"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { assertAdmin } from "@/lib/supabase/assert-admin";
import { assertAdminComNivel } from "@/lib/supabase/assert-permission";
import { planEndDate } from "@/lib/agenda/plans";
import type { Tables } from "@/types/database.types";
import type { ActionResult } from "@/services/pacientes.actions";

type Prioridade = "baixa" | "media" | "alta";
type PacienteOp = Tables<"pacientes"> & {
  plano_entregue_em?: string | null;
  proxima_reconsulta_prevista?: string | null;
  reconsulta_intervalo_dias?: number | null;
};
interface Candidata {
  tipo: string; pacienteId: string | null; motivo: string; prioridade: Prioridade; chaveEvento: string;
  tarefaId?: string | null; consultaId?: string | null; prazo?: string | null;
}

const DIA = 86_400_000;
const ETAPAS_RENOVACAO = new Set(["09_renovacao_30_dias", "10_proposta_enviada", "11_plano_encerrado", "12_reativacao"]);
const chave = (nome: string, ref?: string | number | null) => `${nome}:${ref ?? "sem-ref"}`;

function diasDesde(iso: string | null | undefined, hoje: Date) {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? null : Math.floor((hoje.getTime() - t) / DIA);
}
function diasAte(iso: string | null | undefined, hoje: Date) {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? null : Math.ceil((t - hoje.getTime()) / DIA);
}

async function moverAuto(db: any, p: PacienteOp, etapa: string, observacao: string, agora: Date) {
  if (p.fluxo_etapa === etapa) return;
  const anterior = p.fluxo_etapa;
  const agoraIso = agora.toISOString();
  const { error } = await db.from("pacientes").update({ fluxo_etapa: etapa, fluxo_proxima_acao_em: null, fluxo_updated_at: agoraIso }).eq("id", p.id);
  if (error) return;
  await db.from("fluxo_movimentacoes").insert({ paciente_id: p.id, de_etapa: anterior, para_etapa: etapa, admin_id: null, observacao });
  p.fluxo_etapa = etapa; p.fluxo_updated_at = agoraIso; p.fluxo_proxima_acao_em = null;
}

async function aplicarRenovacao(db: any, pacientes: PacienteOp[], agora: Date) {
  for (const p of pacientes) {
    if (p.status !== "ativo" || p.fluxo_etapa === "pausa_acompanhamento") continue;
    const fim = planEndDate(p.data_inicio, p.plano);
    if (!fim) continue;
    const faltam = Math.ceil((fim.getTime() - agora.getTime()) / DIA);
    if (faltam <= 0 && p.fluxo_etapa !== "11_plano_encerrado" && p.fluxo_etapa !== "12_reativacao") {
      await moverAuto(db, p, "11_plano_encerrado", "Plano chegou ao término contratual sem renovação registrada.", agora);
    } else if (faltam > 0 && faltam <= 30 && !ETAPAS_RENOVACAO.has(p.fluxo_etapa)) {
      await moverAuto(db, p, "09_renovacao_30_dias", `Entrada automática na renovação: faltam ${faltam} dia(s) para o término contratual.`, agora);
    }
  }
}

function detectar(pacientes: PacienteOp[], consultas: Tables<"consultas">[], checkins: Tables<"checkins">[], pagamentos: Tables<"pagamentos">[], tarefas: Tables<"tarefas">[], hoje: Date) {
  const out: Candidata[] = [];
  const consultasPorAuth = new Map<string, Tables<"consultas">[]>();
  const checkinsPorAuth = new Map<string, Tables<"checkins">[]>();
  for (const c of consultas) consultasPorAuth.set(c.auth_id, [...(consultasPorAuth.get(c.auth_id) ?? []), c]);
  for (const c of checkins) checkinsPorAuth.set(c.auth_id, [...(checkinsPorAuth.get(c.auth_id) ?? []), c]);

  for (const p of pacientes) {
    const cs = consultasPorAuth.get(p.auth_id) ?? [];
    const futuras = cs.filter(c => (c.status === "agendada" || c.status === "confirmada") && c.data && new Date(c.data) >= hoje)
      .sort((a,b) => +new Date(a.data ?? 0) - +new Date(b.data ?? 0));
    const proxima = futuras[0];

    for (const c of cs) {
      if (c.status !== "agendada" || !c.data) continue;
      const horas = (new Date(c.data).getTime() - hoje.getTime()) / 3_600_000;
      if (horas >= 0 && horas <= 48) out.push({ tipo:"consulta_nao_confirmada", pacienteId:p.id, consultaId:c.id,
        motivo:`Consulta em ${new Date(c.data).toLocaleString("pt-BR", { dateStyle:"short", timeStyle:"short" })} ainda não confirmada.`,
        prioridade:horas <= 24 ? "alta" : "media", prazo:c.data, chaveEvento:chave("consulta-nao-confirmada", c.id) });
    }

    if (p.status === "ativo" && p.fluxo_etapa !== "pausa_acompanhamento") {
      if (p.fluxo_etapa === "06_plano_elaboracao") out.push({ tipo:"aguardando_plano_alimentar", pacienteId:p.id,
        motivo:"Consulta concluída — finalizar e entregar o plano alimentar.", prioridade:"alta", chaveEvento:chave("plano-elaboracao", p.fluxo_updated_at) });

      const dPlano = diasDesde(p.plano_entregue_em, hoje);
      if (dPlano !== null && dPlano >= 3) out.push({ tipo:"checkin_3_dias_pendente", pacienteId:p.id,
        motivo:"Plano entregue há pelo menos 3 dias. Fazer contato de adaptação, dúvidas e dificuldades iniciais.",
        prioridade:dPlano >= 7 ? "alta" : "media", prazo:p.plano_entregue_em, chaveEvento:chave("pos-plano-d3", p.plano_entregue_em) });
      if (dPlano !== null && dPlano >= 7) out.push({ tipo:"checkin_7_dias_pendente", pacienteId:p.id,
        motivo:"Plano entregue há pelo menos 7 dias. Fazer o segundo contato pós-entrega.", prioridade:"media",
        prazo:p.plano_entregue_em, chaveEvento:chave("pos-plano-d7", p.plano_entregue_em) });

      const chks = (checkinsPorAuth.get(p.auth_id) ?? []).sort((a,b) => +new Date(b.respondido_em ?? b.enviado_em ?? b.created_at ?? 0) - +new Date(a.respondido_em ?? a.enviado_em ?? a.created_at ?? 0));
      const ultimo = chks[0];
      if (ultimo?.status === "enviado") {
        const d = diasDesde(ultimo.enviado_em, hoje) ?? 0;
        if (d >= 2) out.push({ tipo:"checkin_nao_respondido", pacienteId:p.id,
          motivo:d > 5 ? "Check-in continua sem resposta há mais de 5 dias. Fazer novo contato." : "Check-in enviado há 2 dias e ainda sem resposta. Enviar lembrete.",
          prioridade:d > 5 ? "alta" : "media", chaveEvento:chave(d > 5 ? "checkin-sem-resposta-d5" : "checkin-sem-resposta-d2", ultimo.id) });
      } else {
        const ref = ultimo?.respondido_em ?? ultimo?.created_at ?? p.plano_entregue_em;
        const d = diasDesde(ref, hoje);
        if (d !== null && d >= 15) out.push({ tipo:"checkin_pendente_envio", pacienteId:p.id,
          motivo:"Chegou a data do check-in de acompanhamento (15 dias).", prioridade:"media", chaveEvento:chave("checkin-15-dias", ref) });
      }

      const ateReconsulta = diasAte(p.proxima_reconsulta_prevista, hoje);
      if (!proxima && ateReconsulta !== null && ateReconsulta <= 7) out.push({ tipo:"reconsulta_a_confirmar", pacienteId:p.id,
        motivo:ateReconsulta < 0 ? `Reconsulta prevista está atrasada há ${Math.abs(ateReconsulta)} dia(s) e ainda não há consulta futura marcada.` : `Reconsulta prevista em ${ateReconsulta} dia(s) e ainda não há consulta futura marcada.`,
        prioridade:ateReconsulta <= 0 ? "alta" : "media", prazo:p.proxima_reconsulta_prevista, chaveEvento:chave("reconsulta-prevista", p.proxima_reconsulta_prevista) });

      const fim = planEndDate(p.data_inicio, p.plano);
      if (p.fluxo_etapa === "09_renovacao_30_dias" && fim) {
        const faltam = Math.max(0, Math.ceil((fim.getTime() - hoje.getTime()) / DIA));
        out.push({ tipo:"plano_proximo_fim", pacienteId:p.id, motivo:`${p.plano ?? "Plano"} termina em ${faltam} dia(s), em ${fim.toLocaleDateString("pt-BR")}. Preparar e apresentar renovação.`,
          prioridade:faltam <= 7 ? "alta" : "media", prazo:fim.toISOString(), chaveEvento:chave("renovacao-30-dias", fim.toISOString().slice(0,10)) });
      }

      const dEtapa = diasDesde(p.fluxo_updated_at, hoje) ?? 0;
      if (p.fluxo_etapa === "10_proposta_enviada") {
        if (dEtapa >= 3) out.push({ tipo:"renovacao_proposta_pendente", pacienteId:p.id, motivo:"Proposta de renovação enviada há pelo menos 3 dias. Fazer primeiro follow-up.", prioridade:"media", chaveEvento:chave("renovacao-followup-d3", p.fluxo_updated_at) });
        if (dEtapa >= 7) out.push({ tipo:"renovacao_proposta_pendente", pacienteId:p.id, motivo:"Proposta de renovação continua sem resposta após 7 dias. Fazer segundo follow-up.", prioridade:"alta", chaveEvento:chave("renovacao-followup-d7", p.fluxo_updated_at) });
      }
      if (p.fluxo_etapa === "11_plano_encerrado") {
        if (dEtapa >= 3) out.push({ tipo:"reativacao_pendente", pacienteId:p.id, motivo:"Plano encerrado há pelo menos 3 dias. Fazer primeiro contato pós-encerramento.", prioridade:"media", chaveEvento:chave("plano-encerrado-d3", p.fluxo_updated_at) });
        if (dEtapa >= 10) out.push({ tipo:"reativacao_pendente", pacienteId:p.id, motivo:"Plano encerrado há pelo menos 10 dias. Fazer tentativa de reativação.", prioridade:"alta", chaveEvento:chave("plano-encerrado-d10", p.fluxo_updated_at) });
      }
      if (p.fluxo_etapa === "12_reativacao" && dEtapa >= 30) out.push({ tipo:"reativacao_pendente", pacienteId:p.id,
        motivo:"Paciente em reativação há 30 dias. Revisar se deve permanecer ativo ou ser inativado.", prioridade:"media", chaveEvento:chave("reativacao-d30", p.fluxo_updated_at) });

      if (p.fluxo_urgente) out.push({ tipo:"fluxo_urgente", pacienteId:p.id, motivo:p.fluxo_observacoes || "Paciente marcado como urgente no Fluxo.", prioridade:"alta", chaveEvento:chave("fluxo-urgente", p.id) });

      if (proxima?.data) {
        const horas = (new Date(proxima.data).getTime() - hoje.getTime()) / 3_600_000;
        if (horas >= 0 && horas <= 168) {
          if (!p.telefone || !p.cpf) out.push({ tipo:"cadastro_incompleto", pacienteId:p.id, motivo:"Consulta nos próximos 7 dias e cadastro sem telefone e/ou CPF.", prioridade:"media", chaveEvento:chave("cadastro-consulta", proxima.id) });
          if (!p.data_nascimento) out.push({ tipo:"nascimento_ausente", pacienteId:p.id, motivo:"Consulta nos próximos 7 dias e data de nascimento não cadastrada.", prioridade:"media", chaveEvento:chave("nascimento-consulta", proxima.id) });
        }
      }
    }

    for (const pg of pagamentos.filter(x => x.paciente_id === p.id)) if (pg.status === "pendente" || pg.status === "atrasado") out.push({ tipo:"pagamento_pendente", pacienteId:p.id,
      motivo:pg.status === "atrasado" ? "Pagamento em atraso." : "Pagamento pendente.", prioridade:pg.status === "atrasado" ? "alta" : "media", prazo:pg.vencimento, chaveEvento:chave("pagamento", pg.id) });
  }

  const hojeIso = hoje.toISOString().slice(0,10);
  for (const t of tarefas) if (t.status === "pendente" && t.prazo && t.prazo < hojeIso) out.push({ tipo:"tarefa_vencida", pacienteId:t.paciente_id, tarefaId:t.id,
    motivo:`Tarefa "${t.titulo}" venceu em ${new Date(t.prazo).toLocaleDateString("pt-BR")}.`, prioridade:"alta", prazo:t.prazo, chaveEvento:chave("tarefa", t.id) });
  return out;
}

export async function syncPendencias(): Promise<void> {
  await assertAdmin();
  const db = (await createClient()) as any;
  const [pr,cr,chr,pgr,tr,per] = await Promise.all([
    db.from("pacientes").select("*"), db.from("consultas").select("*"), db.from("checkins").select("*"),
    db.from("pagamentos").select("*"), db.from("tarefas").select("*"), db.from("pendencias").select("*"),
  ]);
  const pacientes = (pr.data ?? []) as PacienteOp[];
  const agora = new Date();
  await aplicarRenovacao(db, pacientes, agora);
  const candidatas = detectar(pacientes, cr.data ?? [], chr.data ?? [], pgr.data ?? [], tr.data ?? [], agora);
  const candidatasPorEvento = new Map(candidatas.map(c => [c.chaveEvento, c]));
  const historico = per.data ?? [];
  const eventosJaCriados = new Set(historico.map((p:any) => p.chave_evento).filter(Boolean));
  const ativos = historico.filter((p:any) => p.status !== "resolvida");
  const agoraIso = agora.toISOString();

  const obsoletas = ativos.filter((p:any) => !p.chave_evento || !candidatasPorEvento.has(p.chave_evento)).map((p:any) => p.id);
  if (obsoletas.length) await db.from("pendencias").update({ status:"resolvida", resolvida_em:agoraIso }).in("id", obsoletas);

  const hojeIso = agoraIso.slice(0,10);
  const reabrir = ativos.filter((p:any) => p.status === "adiada" && p.adiada_ate && p.adiada_ate <= hojeIso && p.chave_evento && candidatasPorEvento.has(p.chave_evento)).map((p:any) => p.id);
  if (reabrir.length) await db.from("pendencias").update({ status:"pendente" }).in("id", reabrir);

  const novas = candidatas.filter(c => !eventosJaCriados.has(c.chaveEvento));
  if (novas.length) await db.from("pendencias").insert(novas.map(c => ({ tipo:c.tipo, paciente_id:c.pacienteId, tarefa_id:c.tarefaId ?? null, consulta_id:c.consultaId ?? null,
    motivo:c.motivo, prioridade:c.prioridade, prazo:c.prazo ?? null, chave_evento:c.chaveEvento })));
}

export async function resolverPendenciaAction(id:string): Promise<ActionResult> {
  const { adminId } = await assertAdminComNivel();
  const db = (await createClient()) as any;
  const { data:p } = await db.from("pendencias").select("tipo,paciente_id").eq("id",id).maybeSingle();
  if (p?.tipo === "fluxo_urgente" && p.paciente_id) await db.from("pacientes").update({ fluxo_urgente:false }).eq("id",p.paciente_id);
  const { error } = await db.from("pendencias").update({ status:"resolvida", resolvida_em:new Date().toISOString(), resolvida_por:adminId }).eq("id",id);
  if (error) return { success:false, message:`Erro ao resolver pendência: ${error.message}` };
  revalidatePath("/clara"); return { success:true, message:"Pendência resolvida." };
}

export async function adiarPendenciaAction(id:string, ateIso:string): Promise<ActionResult> {
  await assertAdmin(); const db=(await createClient()) as any;
  const { error }=await db.from("pendencias").update({ status:"adiada", adiada_ate:ateIso }).eq("id",id);
  if (error) return { success:false, message:`Erro ao adiar pendência: ${error.message}` };
  revalidatePath("/clara"); return { success:true, message:"Pendência adiada." };
}
