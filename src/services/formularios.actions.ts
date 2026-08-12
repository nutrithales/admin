"use server";

import { revalidatePath } from "next/cache";
import { assertAdmin } from "@/lib/supabase/assert-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ActionResult } from "@/services/pacientes.actions";

function getFormBaseUrl() {
  return (process.env.NEXT_PUBLIC_FORM_BASE_URL || process.env.NEXT_PUBLIC_ADMIN_URL || "").replace(/\/$/, "");
}

async function enviarWhatsAppTemplate(params: {
  telefone: string;
  nome: string;
  formularioNome: string;
  link: string;
}) {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const templateName = process.env.WHATSAPP_TEMPLATE_FORMULARIO;
  const graphVersion = process.env.WHATSAPP_GRAPH_VERSION || "v23.0";

  if (!phoneNumberId || !accessToken || !templateName) {
    return { ok: false as const, skipped: true as const, message: "WhatsApp ainda não configurado." };
  }

  const telefone = params.telefone.replace(/\D/g, "");
  const response = await fetch(`https://graph.facebook.com/${graphVersion}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: telefone,
      type: "template",
      template: {
        name: templateName,
        language: { code: "pt_BR" },
        components: [
          {
            type: "body",
            parameters: [
              { type: "text", text: params.nome },
              { type: "text", text: params.formularioNome },
              { type: "text", text: params.link },
            ],
          },
        ],
      },
    }),
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    return {
      ok: false as const,
      skipped: false as const,
      message: body?.error?.message || `Erro do WhatsApp (${response.status}).`,
    };
  }

  return {
    ok: true as const,
    skipped: false as const,
    messageId: body?.messages?.[0]?.id as string | undefined,
  };
}

export async function criarEnvioFormularioAction(formData: FormData): Promise<ActionResult> {
  await assertAdmin();

  const formularioId = String(formData.get("formulario_id") || "");
  const pacienteId = String(formData.get("paciente_id") || "");
  const enviarWhatsapp = String(formData.get("enviar_whatsapp") || "") === "on";

  if (!formularioId || !pacienteId) {
    return { success: false, message: "Selecione o formulário e o paciente." };
  }

  const supabase = createAdminClient() as any;
  const [{ data: formulario, error: formularioError }, { data: paciente, error: pacienteError }] = await Promise.all([
    supabase.from("formularios").select("id,nome,tipo").eq("id", formularioId).maybeSingle(),
    supabase.from("pacientes").select("id,auth_id,nome,telefone").eq("id", pacienteId).maybeSingle(),
  ]);

  if (formularioError || !formulario) return { success: false, message: "Formulário não encontrado." };
  if (pacienteError || !paciente) return { success: false, message: "Paciente não encontrado." };

  const { data: envio, error: envioError } = await supabase
    .from("formulario_envios")
    .insert({
      formulario_id: formularioId,
      paciente_id: pacienteId,
      status: enviarWhatsapp ? "agendado" : "enviado",
      canal: enviarWhatsapp ? "whatsapp" : "link",
      agendado_para: new Date().toISOString(),
      enviado_em: enviarWhatsapp ? null : new Date().toISOString(),
    })
    .select("id,token")
    .single();

  if (envioError || !envio) {
    return { success: false, message: `Erro ao criar envio: ${envioError?.message ?? "erro desconhecido"}` };
  }

  const baseUrl = getFormBaseUrl();
  const link = baseUrl ? `${baseUrl}/f/${envio.token}` : `/f/${envio.token}`;

  if (!enviarWhatsapp) {
    revalidatePath("/formularios");
    return { success: true, message: `Link criado: ${link}` };
  }

  if (!paciente.telefone) {
    await supabase.from("formulario_envios").update({ status: "erro", ultimo_erro: "Paciente sem telefone cadastrado." }).eq("id", envio.id);
    revalidatePath("/formularios");
    return { success: false, message: `Envio criado, mas o paciente não possui telefone. Link: ${link}` };
  }

  if (!baseUrl) {
    await supabase.from("formulario_envios").update({ status: "erro", ultimo_erro: "NEXT_PUBLIC_FORM_BASE_URL não configurada." }).eq("id", envio.id);
    revalidatePath("/formularios");
    return { success: false, message: `Envio criado, mas falta configurar a URL pública dos formulários. Link: ${link}` };
  }

  const whatsapp = await enviarWhatsAppTemplate({
    telefone: paciente.telefone,
    nome: paciente.nome || "Paciente",
    formularioNome: formulario.nome,
    link,
  });

  if (!whatsapp.ok) {
    await supabase.from("formulario_envios").update({ status: "erro", ultimo_erro: whatsapp.message }).eq("id", envio.id);
    await supabase.from("whatsapp_envios").insert({
      formulario_envio_id: envio.id,
      paciente_id: pacienteId,
      tipo: "formulario",
      status: "erro",
      erro: whatsapp.message,
      payload: { link, formulario: formulario.nome },
    });
    revalidatePath("/formularios");
    return { success: false, message: `${whatsapp.message} Link disponível: ${link}` };
  }

  const agora = new Date().toISOString();
  await Promise.all([
    supabase.from("formulario_envios").update({ status: "enviado", enviado_em: agora, meta_message_id: whatsapp.messageId ?? null, ultimo_erro: null }).eq("id", envio.id),
    supabase.from("whatsapp_envios").insert({
      formulario_envio_id: envio.id,
      paciente_id: pacienteId,
      tipo: "formulario",
      status: "enviado",
      meta_message_id: whatsapp.messageId ?? null,
      payload: { link, formulario: formulario.nome },
    }),
  ]);

  revalidatePath("/formularios");
  return { success: true, message: `Formulário enviado para ${paciente.nome || "o paciente"} pelo WhatsApp.` };
}
