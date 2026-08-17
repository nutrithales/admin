"use server";

import { createElement } from "react";
import { revalidatePath } from "next/cache";
import { renderToBuffer } from "@react-pdf/renderer";
import { assertAdmin } from "@/lib/supabase/assert-admin";
import { createClient } from "@/lib/supabase/server";
import { getPlanoEstruturado } from "@/services/planos-estruturados.queries";
import {
  PlanoAlimentarPdf,
  type PlanoPdfData,
  type PlanoPdfSubstituicaoGrupo,
} from "@/lib/pdf/plano-alimentar";
import type { ActionResult } from "@/services/pacientes.actions";

type PdfDocumentElement = Parameters<typeof renderToBuffer>[0];
const BUCKET = "planos";

interface SubstituicaoRpcRow {
  refeicao_id: string;
  refeicao_nome: string;
  refeicao_ordem: number;
  opcao_numero: number;
  opcao_nome: string | null;
  item_id: string;
  alimento_origem_id: string;
  alimento_origem_nome: string;
  quantidade_origem_g: number;
  grupo_codigo: string;
  grupo_nome: string;
  alimento_substituto_id: string;
  alimento_substituto_nome: string;
  quantidade_substituto_g: number;
}

async function carregarSubstituicoesAmpliadas(
  supabase: Awaited<ReturnType<typeof createClient>>,
  planoId: string,
): Promise<PlanoPdfSubstituicaoGrupo[]> {
  const rpcClient = supabase as unknown as {
    rpc: (
      fn: string,
      args: Record<string, unknown>,
    ) => Promise<{ data: unknown; error: { message: string } | null }>;
  };

  const { data, error } = await rpcClient.rpc("substituicoes_ampliadas_plano", { p_plano_id: planoId });
  if (error) throw new Error(`Erro ao calcular substituições: ${error.message}`);

  const linhas = (data ?? []) as SubstituicaoRpcRow[];
  const grupos = new Map<string, PlanoPdfSubstituicaoGrupo>();

  for (const linha of linhas) {
    const chave = `${linha.refeicao_id}:${linha.opcao_numero}:${linha.item_id}`;
    const atual = grupos.get(chave);
    if (atual) {
      atual.substituicoes.push({
        nome: linha.alimento_substituto_nome,
        quantidadeG: Number(linha.quantidade_substituto_g),
      });
      continue;
    }

    grupos.set(chave, {
      refeicao: linha.refeicao_nome,
      refeicaoOrdem: Number(linha.refeicao_ordem),
      opcaoNumero: Number(linha.opcao_numero),
      opcaoNome: linha.opcao_nome,
      alimentoOrigem: linha.alimento_origem_nome,
      quantidadeOrigemG: Number(linha.quantidade_origem_g),
      grupoNome: linha.grupo_nome,
      substituicoes: [
        {
          nome: linha.alimento_substituto_nome,
          quantidadeG: Number(linha.quantidade_substituto_g),
        },
      ],
    });
  }

  return [...grupos.values()].sort((a, b) =>
    a.refeicaoOrdem - b.refeicaoOrdem ||
    a.opcaoNumero - b.opcaoNumero ||
    a.alimentoOrigem.localeCompare(b.alimentoOrigem, "pt-BR"),
  );
}

export async function exportarPlanoPdfAction(planoEstruturadoId: string): Promise<ActionResult> {
  await assertAdmin();
  const supabase = await createClient();

  const plano = await getPlanoEstruturado(planoEstruturadoId);
  if (!plano) return { success: false, message: "Plano não encontrado." };
  if (plano.refeicoes.every((r) => r.itens.length === 0)) {
    return { success: false, message: "Adicione pelo menos um item ao plano antes de exportar." };
  }

  const [{ data: config }, substituicoes] = await Promise.all([
    supabase
      .from("configuracoes_consultorio")
      .select("nome_consultorio")
      .eq("id", true)
      .maybeSingle(),
    carregarSubstituicoesAmpliadas(supabase, planoEstruturadoId),
  ]);

  const dadosPdf: PlanoPdfData = {
    clinica: { nome: config?.nome_consultorio || "Nutri Thales Rosa" },
    paciente: { nome: plano.paciente?.nome || "Paciente" },
    titulo: plano.titulo || "Plano Alimentar",
    metas: {
      kcal: plano.meta_kcal,
      proteina_g: plano.meta_proteina_g,
      carboidrato_g: plano.meta_carboidrato_g,
      gordura_g: plano.meta_gordura_g,
    },
    observacoes: plano.observacoes,
    substituicoes,
    refeicoes: [...plano.refeicoes]
      .sort((a, b) => a.ordem - b.ordem)
      .map((refeicao) => {
        const grupos = new Map<number, typeof refeicao.itens>();
        for (const item of refeicao.itens) {
          const numero = item.opcao_numero ?? 1;
          grupos.set(numero, [...(grupos.get(numero) ?? []), item]);
        }

        return {
          nome: refeicao.nome,
          observacoes: refeicao.observacoes,
          opcoes: [...grupos.entries()]
            .sort(([a], [b]) => a - b)
            .map(([numero, itens]) => ({
              numero,
              nome: itens.find((item) => item.opcao_nome)?.opcao_nome ?? null,
              itens: [...itens]
                .sort((a, b) => a.ordem - b.ordem)
                .map((item) => {
                  const tipoA = item.papel_macro === "livre";
                  const tipoB = item.papel_macro === "vegetal_b";
                  return {
                    nome: tipoA ? "Vegetais Tipo A" : tipoB ? "Vegetais Tipo B" : item.receita?.nome ?? item.alimento?.nome ?? "Item",
                    quantidade_texto: tipoA ? "livre" : tipoB ? "1 porção" : undefined,
                    quantidade_g: !tipoA && !tipoB && item.alimento ? (item.quantidade_g ?? undefined) : undefined,
                    ingredientes: item.receita
                      ? item.ingredientes.map((ing) => ({ nome: ing.alimento.nome, quantidade_g: ing.quantidade_g_final }))
                      : undefined,
                  };
                }),
            })),
        };
      }),
  };

  let buffer: Buffer;
  try {
    const documentElement = createElement(PlanoAlimentarPdf, { data: dadosPdf }) as unknown as PdfDocumentElement;
    buffer = await renderToBuffer(documentElement);
  } catch (err) {
    return { success: false, message: `Erro ao gerar PDF: ${err instanceof Error ? err.message : "erro desconhecido"}` };
  }

  const path = `${plano.auth_id}/${crypto.randomUUID()}.pdf`;
  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, buffer, { contentType: "application/pdf" });
  if (uploadError) return { success: false, message: `Erro ao enviar PDF: ${uploadError.message}` };

  const { data: existente } = await supabase
    .from("planos_alimentares")
    .select("id, path")
    .eq("plano_estruturado_id", planoEstruturadoId)
    .maybeSingle();

  if (existente) {
    const { error: updateError } = await supabase
      .from("planos_alimentares")
      .update({ path, bucket: BUCKET, titulo: dadosPdf.titulo, data_envio: new Date().toISOString(), ativo: true })
      .eq("id", existente.id);

    if (updateError) {
      await supabase.storage.from(BUCKET).remove([path]);
      return { success: false, message: `Erro ao salvar plano: ${updateError.message}` };
    }
    if (existente.path) await supabase.storage.from(BUCKET).remove([existente.path]);
  } else {
    const { error: insertError } = await supabase.from("planos_alimentares").insert({
      auth_id: plano.auth_id,
      titulo: dadosPdf.titulo,
      tipo: "pdf",
      bucket: BUCKET,
      path,
      ativo: true,
      data_envio: new Date().toISOString(),
      plano_estruturado_id: planoEstruturadoId,
    });

    if (insertError) {
      await supabase.storage.from(BUCKET).remove([path]);
      return { success: false, message: `Erro ao salvar plano: ${insertError.message}` };
    }
  }

  revalidatePath("/planos-alimentares");
  revalidatePath(`/planos-alimentares/${planoEstruturadoId}`);
  return { success: true, message: "PDF exportado com lista ampliada de substituições." };
}
