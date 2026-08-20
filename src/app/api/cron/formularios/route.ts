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

  if (!phoneNumberId || !accessToken || !templateName) {
    return { ok: false as const, message: "Integração do WhatsApp não configurada no ambiente." };
  }

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
        components: [{
          type: "body",
          parameters: [
            { type: "text", text: params.nome },
            { type: "text", text: params.formularioNome },
            { type: "text", text: params.link },
          ],
        }],
      },
    }),
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) return { ok: false as const, message: body?.error?.message || `Erro do WhatsApp (${response.status}).` };
  return { ok: true as const, messageId: body?.messages?.[0]?.id as string | undefined };
}

function nextFutureCycle(currentIso: string, recurrenceDays: number, now: Date) {
  let next = new Date(currentIso);
  do next = new Date(next.getTime() + recurrenceDays * 86_400_000);
  while (next <= now);
  return next.toISOString();
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createAdminClient() as any;
  const now = new Date();
  const nowIso = now.toISOString();
  const origin = baseUrl();
  const result = { automacoes: 0, agendados: 0, enviados: 0, erros: 0, ignorados: 0 };

  const { data: automacoes, error: automacoesError } = await supabase
    .from("formulario_automacoes")
    .select("id,formulario_id,publico,paciente_ids,recorrencia_dias,proximo_disparo_em")
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
    if (pacientesError) {
      result.erros += 1;
      continue;
    }

    const ciclo = automacao.proximo_disparo_em;
    for (const paciente of pacientes ?? []) {
      const { error } = await supabase.from("formulario_envios").insert({
        formulario_id: automacao.formulario_id,
        paciente_id: paciente.id,
        automacao_id: automacao.id,
        ciclo_referencia: ciclo,
        status: "agendado",
        canal: "whatsapp",
        agendado_para: nowIso,
      });
      if (!error) result.agendados += 1;
      else if (error.code === "23505") result.ignorados += 1;
      else result.erros += 1;
    }

    await supabase.from("formulario_automacoes").update({
      ultimo_disparo_em: nowIso,
      proximo_disparo_em: nextFutureCycle(ciclo, automacao.recorrencia_dias, now),
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
    const { data: claimed } = await supabase
      .from("formulario_envios")
      .update({ status: "processando", updated_at: nowIso })
      .eq("id", envio.id)
      .eq("status", "agendado")
      .select("id")
      .maybeSingle();

    if (!claimed) {
      result.ignorados += 1;
      continue;
    }

    if (!envio.paciente?.telefone || !origin) {
      const message = !envio.paciente?.telefone ? "Paciente sem telefone cadastrado." : "URL pública dos formulários não configurada.";
      await supabase.from("formulario_envios").update({ status: "erro", ultimo_erro: message, updated_at: new Date().toISOString() }).eq("id", envio.id);
      await supabase.from("whatsapp_envios").insert({ formulario_envio_id: envio.id, paciente_id: envio.paciente_id, tipo: "formulario", status: "erro", erro: message });
      result.erros += 1;
      continue;
    }

    const link = `${origin}/f/${envio.token}`;
    const whatsapp = await sendWhatsApp({
      telefone: envio.paciente.telefone,
      nome: envio.paciente.nome || "Paciente",
      formularioNome: envio.formulario?.nome || "Check-in",
      link,
    });

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
