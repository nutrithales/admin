"use server";

import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";

function valueToNumber(value: FormDataEntryValue | null) {
  if (value === null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export async function responderFormularioAction(token: string, formData: FormData) {
  const supabase = createAdminClient() as any;
  const { data: envio } = await supabase
    .from("formulario_envios")
    .select("id,status,expira_em,paciente_id, formulario:formularios(id,nome,tipo), paciente:pacientes(id,auth_id,nome)")
    .eq("token", token)
    .maybeSingle();

  if (!envio || envio.status === "cancelado" || envio.status === "expirado") {
    redirect(`/f/${token}?status=indisponivel`);
  }

  if (envio.respondido_em || envio.status === "respondido") {
    redirect(`/f/${token}?status=respondido`);
  }

  if (new Date(envio.expira_em).getTime() < Date.now()) {
    await supabase.from("formulario_envios").update({ status: "expirado" }).eq("id", envio.id);
    redirect(`/f/${token}?status=expirado`);
  }

  const { data: perguntas } = await supabase
    .from("formulario_perguntas")
    .select("chave,titulo,tipo,obrigatoria,minimo,maximo")
    .eq("formulario_id", envio.formulario.id)
    .order("ordem", { ascending: true });

  const respostas: Record<string, unknown> = {};
  const notas: number[] = [];
  let requerAtencao = false;

  for (const pergunta of perguntas ?? []) {
    const bruto = formData.get(pergunta.chave);
    if (pergunta.obrigatoria && (bruto === null || String(bruto).trim() === "")) {
      redirect(`/f/${token}?erro=obrigatorio`);
    }

    if (pergunta.tipo === "numero" || pergunta.tipo === "escala") {
      const numero = valueToNumber(bruto);
      respostas[pergunta.chave] = numero;
      if (numero !== null) {
        if (pergunta.tipo === "escala") notas.push(numero);
        if (pergunta.tipo === "escala" && numero <= 2) requerAtencao = true;
      }
    } else if (pergunta.tipo === "sim_nao") {
      respostas[pergunta.chave] = bruto === "sim";
    } else {
      respostas[pergunta.chave] = bruto === null ? "" : String(bruto).trim();
    }
  }

  const pontuacao = notas.length ? Math.round((notas.reduce((a, b) => a + b, 0) / notas.length) * 20) : null;
  const observacao = typeof respostas.observacoes === "string" ? respostas.observacoes : "";
  const resumo = pontuacao !== null
    ? `Aderência média do check-in: ${pontuacao}%.${observacao ? ` Observação do paciente: ${observacao}` : ""}`
    : observacao || `Resposta recebida para ${envio.formulario.nome}.`;

  const agora = new Date().toISOString();

  const { error: respostaError } = await supabase.from("formulario_respostas").insert({
    envio_id: envio.id,
    respostas,
    pontuacao,
    resumo,
    requer_atencao: requerAtencao,
  });

  if (respostaError) {
    redirect(`/f/${token}?erro=salvar`);
  }

  await supabase.from("formulario_envios").update({ status: "respondido", respondido_em: agora, updated_at: agora }).eq("id", envio.id);

  if (envio.formulario.tipo === "checkin" && envio.paciente?.auth_id) {
    await supabase.from("checkins").insert({
      auth_id: envio.paciente.auth_id,
      semana: agora.slice(0, 10),
      resumo,
      pontuacao,
      origem: "whatsapp",
      status: "respondido",
      enviado_em: null,
      respondido_em: agora,
      revisado: false,
    });
  }

  if (requerAtencao) {
    const existe = await supabase
      .from("pendencias")
      .select("id")
      .eq("paciente_id", envio.paciente_id)
      .eq("tipo", "checkin_atencao")
      .eq("status", "pendente")
      .limit(1)
      .maybeSingle();

    if (!existe.data) {
      await supabase.from("pendencias").insert({
        tipo: "checkin_atencao",
        paciente_id: envio.paciente_id,
        motivo: `Check-in de ${envio.paciente?.nome || "paciente"} possui resposta que merece atenção.`,
        prioridade: "alta",
        status: "pendente",
      });
    }
  }

  redirect(`/f/${token}?status=sucesso`);
}
