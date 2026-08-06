"use server";

import { createElement } from "react";
import { revalidatePath } from "next/cache";
import { renderToBuffer } from "@react-pdf/renderer";
import { assertAdmin } from "@/lib/supabase/assert-admin";
import { createClient } from "@/lib/supabase/server";
import { getPlanoEstruturado } from "@/services/planos-estruturados.queries";
import { PlanoAlimentarPdf, type PlanoPdfData } from "@/lib/pdf/plano-alimentar";
import type { ActionResult } from "@/services/pacientes.actions";

const BUCKET = "planos";

/** Reaproveita literalmente o padrão de upload + limpeza compensatória de
 * `planos.actions.ts`: o PDF exportado vira/atualiza uma linha em
 * `planos_alimentares` apontando pro plano estruturado que a gerou. */
export async function exportarPlanoPdfAction(planoEstruturadoId: string): Promise<ActionResult> {
  await assertAdmin();
  const supabase = await createClient();

  const plano = await getPlanoEstruturado(planoEstruturadoId);
  if (!plano) return { success: false, message: "Plano não encontrado." };
  if (plano.refeicoes.every((r) => r.itens.length === 0)) {
    return { success: false, message: "Adicione pelo menos um item ao plano antes de exportar." };
  }

  const { data: config } = await supabase
    .from("configuracoes_consultorio")
    .select("nome_consultorio")
    .eq("id", true)
    .maybeSingle();

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
    refeicoes: [...plano.refeicoes]
      .sort((a, b) => a.ordem - b.ordem)
      .map((refeicao) => ({
        nome: refeicao.nome,
        itens: [...refeicao.itens]
          .sort((a, b) => a.ordem - b.ordem)
          .map((item) => ({
            nome: item.receita?.nome ?? item.alimento?.nome ?? "Item",
            quantidade_g: item.alimento ? (item.quantidade_g ?? undefined) : undefined,
            ingredientes: item.receita
              ? item.ingredientes.map((ing) => ({ nome: ing.alimento.nome, quantidade_g: ing.quantidade_g_final }))
              : undefined,
          })),
      })),
  };

  let buffer: Buffer;
  try {
    buffer = await renderToBuffer(createElement(PlanoAlimentarPdf, { data: dadosPdf }));
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
  return { success: true, message: "PDF exportado e disponível para o paciente." };
}
