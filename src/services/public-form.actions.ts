"use server";

import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";

function valueToNumber(value: FormDataEntryValue | null) {
  if (value === null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function optionScore(opcoes: unknown, value: string) {
  if (!Array.isArray(opcoes)) return null;
  const option = opcoes.find((item: any) => String(item?.value) === value) as any;
  const score = Number(option?.score);
  return Number.isFinite(score) ? score : null;
}

export async function responderFormularioAction(token: string, formData: FormData) {
  const supabase = createAdminClient() as any;
  const { data: envio } = await supabase
    .from("formulario_envios")
    .select("id,status,expira_em,paciente_id, formulario:formularios(id,nome,tipo,exibir_score), paciente:pacientes(id,auth_id,nome)")
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
    .select("chave,titulo,tipo,obrigatoria,minimo,maximo,opcoes,exibir,peso,pontuavel")
    .eq("formulario_id", envio.formulario.id)
    .eq("exibir", true)
    .order("ordem", { ascending: true });

  const respostas: Record<string, unknown> = {};
  let pontosObtidos = 0;
  let pontosPossiveis = 0;
  let requerAtencao = false;

  for (const pergunta of perguntas ?? []) {
    const bruto = formData.get(pergunta.chave);
    if (pergunta.obrigatoria && (bruto === null || String(bruto).trim() === "")) {
      redirect(`/f/${token}?erro=obrigatorio`);
    }

    let scoreResposta: number | null = null;

    if (pergunta.tipo === "numero" || pergunta.tipo === "escala") {
      const numero = valueToNumber(bruto);
      respostas[pergunta.chave] = numero;
      if (numero !== null && pergunta.tipo === "escala") scoreResposta = numero;
    } else if (pergunta.tipo === "sim_nao") {
      respostas[pergunta.chave] = bruto === "sim";
    } else {
      const valor = bruto === null ? "" : String(bruto).trim();
      respostas[pergunta.chave] = valor;
      if (pergunta.tipo === "selecao") scoreResposta = optionScore(pergunta.opcoes, valor);
    }

    if (pergunta.pontuavel && scoreResposta !== null) {
      const peso = Number(pergunta.peso ?? 0);
      const pesoEfetivo = Number.isFinite(peso) ? peso : 0;
      pontosObtidos += scoreResposta * pesoEfetivo;
      pontosPossiveis += 5 * pesoEfetivo;
      if (scoreResposta <= 2) requerAtencao = true;
    }
  }

  const pontuacao = pontosPossiveis > 0 ? Math.round((pontosObtidos / pontosPossiveis) * 100) : null;
  const feedback = typeof respostas.feedback === "string" ? respostas.feedback : "";
  const resumo = pontuacao !== null
    ? `Score do check-in: ${pontuacao}%.${feedback ? ` Feedback do paciente: ${feedback}` : ""}`
    : feedback || `Resposta recebida para ${envio.formulario.nome}.`;

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
        motivo: `Check-in de ${envio.paciente?.nome || "paciente"} possui uma ou mais respostas com pontuação baixa.`,
        prioridade: "alta",
        status: "pendente",
      });
    }
  }

  redirect(`/f/${token}?status=sucesso`);
}
