import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorized(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

function baseUrl() {
  return (process.env.NEXT_PUBLIC_FORM_BASE_URL || process.env.NEXT_PUBLIC_ADMIN_URL || "").replace(/\/$/, "");
}

function normalizePhone(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 10 || digits.length === 11) return `55${digits}`;
  return digits;
}

async function sendWhatsApp(params: { telefone: string; nome: string; formularioNome: string; link: string }) {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const templateName = process.env.WHATSAPP_TEMPLATE_FORMULARIO;
  const graphVersion = process.env.WHATSAPP_GRAPH_VERSION || "v23.0";
  if (!phoneNumberId || !accessToken || !templateName) return { ok: false as const, message: "Integração do WhatsApp não configurada no ambiente." };

  const response = await fetch(`https://graph.facebook.com/${graphVersion}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: normalizePhone(params.telefone),
      type: "template",
      template: {
        name: templateName,
        language: { code: "pt_BR" },
        components: [{ type: "body", parameters: [
          { type: "text", text: params.nome },
          { type: "text", text: params.formularioNome },
          { type: "text", text: params.link },
        ] }],
      },
    }),
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) return { ok: false as const, message: body?.error?.message || `Erro do WhatsApp (${response.status}).` };
  return { ok: true as const, messageId: body?.messages?.[0]?.id as string | undefined };
}

function addDays(iso: string, days: number) {
  return new Date(new Date(iso).getTime() + days * 86_400_000).toISOString();
}

function addMonthSaoPaulo(iso: string, diaMes: number) {
  const shifted = new Date(new Date(iso).getTime() - 3 * 3_600_000);
  shifted.setUTCMonth(shifted.getUTCMonth() + 1);
  shifted.setUTCDate(diaMes);
  return new Date(shifted.getTime() + 3 * 3_600_000).toISOString();
}

function nextFutureCycle(automacao: any, now: Date) {
  let next = automacao.proximo_disparo_em as string;
  do {
    if (automacao.frequencia_tipo === "semanal") next = addDays(next, 7);
    else if (automacao.frequencia_tipo === "mensal") next = addMonthSaoPaulo(next, Number(automacao.dia_mes));
    else next = addDays(next, Number(automacao.recorrencia_dias));
  } while (new Date(next) <= now);
  return next;
}

async function avaliarDuasAusenciasSeguidas(supabase: any, pacienteId: string) {
  const { data: ultimos } = await supabase
    .from("formulario_envios")
    .select("id,status,agendado_para, formulario:formularios(tipo), paciente:pacientes(nome)")
    .eq("paciente_id", pacienteId)
    .in("status", ["respondido", "expirado"])
    .order("agendado_para", { ascending: false })
    .limit(6);

  const checkins = (ultimos ?? []).filter((e: any) => e.formulario?.tipo === "checkin").slice(0, 2);
  if (checkins.length < 2 || !checkins.every((e: any) => e.status === "expirado")) return;

  const chave = `checkin_sem_resposta_2:${pacienteId}`;
  const { data: existente } = await supabase.from("pendencias").select("id,status").eq("chave_evento", chave).in("status", ["pendente", "adiada"]).maybeSingle();
  if (existente) return;

  await supabase.from("pendencias").insert({
    tipo: "checkin_sem_resposta_2",
    paciente_id: pacienteId,
    motivo: `${checkins[0]?.paciente?.nome || "Paciente"} não respondeu aos 2 últimos check-ins consecutivos.`,
    prioridade: "alta",
    status: "pendente",
    chave_evento: chave,
  });
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createAdminClient() as any;
  const now = new Date();
  const nowIso = now.toISOString();
  const origin = baseUrl();
  const result = { automacoes: 0, agendados: 0, enviados: 0, expirados: 0, alertas: 0, erros: 0, ignorados: 0 };

  const staleProcessing = new Date(now.getTime() - 15 * 60_000).toISOString();
  await supabase.from("formulario_envios").update({ status: "agendado", updated_at: nowIso }).eq("status", "processando").lt("updated_at", staleProcessing);

  const { data: expirados } = await supabase
    .from("formulario_envios")
    .update({ status: "expirado", updated_at: nowIso })
    .in("status", ["enviado", "visualizado"])
    .lt("expira_em", nowIso)
    .select("id,paciente_id");
  result.expirados = expirados?.length ?? 0;

  for (const pacienteId of [...new Set((expirados ?? []).map((e: any) => e.paciente_id).filter(Boolean))] as string[]) {
    const antes = await supabase.from("pendencias").select("id", { count: "exact", head: true }).eq("chave_evento", `checkin_sem_resposta_2:${pacienteId}`).in("status", ["pendente", "adiada"]);
    await avaliarDuasAusenciasSeguidas(supabase, pacienteId);
    const depois = await supabase.from("pendencias").select("id", { count: "exact", head: true }).eq("chave_evento", `checkin_sem_resposta_2:${pacienteId}`).in("status", ["pendente", "adiada"]);
    if ((depois.count ?? 0) > (antes.count ?? 0)) result.alertas += 1;
  }

  const { data: automacoes, error: automacoesError } = await supabase
    .from("formulario_automacoes")
    .select("id,formulario_id,publico,paciente_ids,frequencia_tipo,recorrencia_dias,dia_semana,dia_mes,prazo_resposta_dias,proximo_disparo_em")
    .eq("ativo", true)
    .lte("proximo_disparo_em", nowIso)
    .order("proximo_disparo_em", { ascending: true })
    .limit(50);
  if (automacoesError) return NextResponse.json({ error: automacoesError.message }, { status: 500 });

  for (const automacao of automacoes ?? []) {
    result.automacoes += 1;
    let pacientesQuery = supabase.from("pacientes").select("id");
    if (automacao.publico === "ativos") pacientesQuery = pacientesQuery.eq("status", "ativo");
    if (automacao.publico === "selecionados") pacientesQuery = pacientesQuery.in("id", automacao.paciente_ids ?? []);

    const { data: pacientes, error: pacientesError } = await pacientesQuery;
    if (pacientesError) { result.erros += 1; continue; }

    const ciclo = automacao.proximo_disparo_em;
    const expiraEm = new Date(now.getTime() + Number(automacao.prazo_resposta_dias) * 86_400_000).toISOString();
    for (const paciente of pacientes ?? []) {
      const { error } = await supabase.from("formulario_envios").insert({
        formulario_id: automacao.formulario_id,
        paciente_id: paciente.id,
        automacao_id: automacao.id,
        ciclo_referencia: ciclo,
        status: "agendado",
        canal: "whatsapp",
        agendado_para: nowIso,
        expira_em: expiraEm,
      });
      if (!error) result.agendados += 1;
      else if (error.code === "23505") result.ignorados += 1;
      else result.erros += 1;
    }

    await supabase.from("formulario_automacoes").update({
      ultimo_disparo_em: nowIso,
      proximo_disparo_em: nextFutureCycle(automacao, now),
      updated_at: nowIso,
    }).eq("id", automacao.id).eq("proximo_disparo_em", ciclo);
  }

  const { data: envios, error: enviosError } = await supabase
    .from("formulario_envios")
    .select("id,token,paciente_id, formulario:formularios(nome), paciente:pacientes(nome,telefone)")
    .eq("status", "agendado")
    .lte("agendado_para", nowIso)
    .order("agendado_para", { ascending: true })
    .limit(200);
  if (enviosError) return NextResponse.json({ error: enviosError.message, ...result }, { status: 500 });

  for (const envio of envios ?? []) {
    const { data: claimed } = await supabase.from("formulario_envios").update({ status: "processando", updated_at: nowIso }).eq("id", envio.id).eq("status", "agendado").select("id").maybeSingle();
    if (!claimed) { result.ignorados += 1; continue; }

    if (!envio.paciente?.telefone || !origin) {
      const message = !envio.paciente?.telefone ? "Paciente sem telefone cadastrado." : "URL pública dos formulários não configurada.";
      await supabase.from("formulario_envios").update({ status: "erro", ultimo_erro: message, updated_at: new Date().toISOString() }).eq("id", envio.id);
      await supabase.from("whatsapp_envios").insert({ formulario_envio_id: envio.id, paciente_id: envio.paciente_id, tipo: "formulario", status: "erro", erro: message });
      result.erros += 1;
      continue;
    }

    const link = `${origin}/f/${envio.token}`;
    const whatsapp = await sendWhatsApp({ telefone: envio.paciente.telefone, nome: envio.paciente.nome || "Paciente", formularioNome: envio.formulario?.nome || "Check-in", link });
    if (!whatsapp.ok) {
      await supabase.from("formulario_envios").update({ status: "erro", ultimo_erro: whatsapp.message, updated_at: new Date().toISOString() }).eq("id", envio.id);
      await supabase.from("whatsapp_envios").insert({ formulario_envio_id: envio.id, paciente_id: envio.paciente_id, tipo: "formulario", status: "erro", erro: whatsapp.message, payload: { link } });
      result.erros += 1;
      continue;
    }

    const sentAt = new Date().toISOString();
    await Promise.all([
      supabase.from("formulario_envios").update({ status: "enviado", enviado_em: sentAt, meta_message_id: whatsapp.messageId ?? null, ultimo_erro: null, updated_at: sentAt }).eq("id", envio.id),
      supabase.from("whatsapp_envios").insert({ formulario_envio_id: envio.id, paciente_id: envio.paciente_id, tipo: "formulario", status: "enviado", meta_message_id: whatsapp.messageId ?? null, payload: { link } }),
    ]);
    result.enviados += 1;
  }

  return NextResponse.json({ ok: true, ...result, processed_at: new Date().toISOString() });
}
