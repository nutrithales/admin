"use server";

import { createElement } from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { getPlanoAlimentarPacienteAtual } from "@/services/paciente-plano.queries";
import { PlanoAlimentarPdf, type PlanoPdfData } from "@/lib/pdf/plano-alimentar";

// The authenticated session selects the plan; no patient or plan ID is accepted.
export async function baixarMeuPlanoPdfAction(): Promise<
  { success: true; base64: string } | { success: false; message: string }
> {
  try {
    const plano = await getPlanoAlimentarPacienteAtual();
    if (!plano) return { success: false, message: "Entre novamente para acessar seu plano alimentar." };
    const data: PlanoPdfData = {
      clinica: { nome: "Nutri Thales Rosa" },
      paciente: { nome: plano.pacienteNome },
      titulo: plano.titulo,
      metas: { kcal: plano.metas.kcal, proteina_g: plano.metas.proteinaG, carboidrato_g: plano.metas.carboidratoG, gordura_g: plano.metas.gorduraG },
      observacoes: plano.observacoes,
      refeicoes: plano.refeicoes.map(r => ({
        nome: r.nome, observacoes: r.observacoes,
        opcoes: r.opcoes.map(o => ({ numero: o.numero, nome: o.nome, observacoes: o.observacoes,
          itens: o.itens.map(i => ({ nome: i.nome,
            quantidade_g: i.quantidadeG,
            quantidade_texto: [i.quantidadeTexto ?? (i.quantidadeG != null ? `${i.quantidadeG} g` : ""), i.medidaCaseira].filter(Boolean).join(" • "),
            ingredientes: i.ingredientes?.map(ing => ({ nome: ing.nome, quantidade_g: ing.quantidadeG })),
          })),
        })),
      })),
      substituicoes: plano.refeicoes.flatMap(r => r.opcoes.flatMap(o => o.itens.flatMap(i => {
        const subs = plano.substituicoes.filter(s => s.itemId === i.id);
        if (!subs.length || i.papelMacro === "livre" || i.papelMacro === "vegetal_b") return [];
        return [{ refeicao: r.nome, refeicaoOrdem: r.ordem, opcaoNumero: o.numero, opcaoNome: o.nome,
          alimentoOrigem: i.nome, quantidadeOrigemG: i.quantidadeG ?? 0, grupoNome: subs[0].grupo,
          substituicoes: subs.map(s => ({ nome: s.nome + (s.medidaCaseira ? ` (${s.medidaCaseira})` : ""), quantidadeG: s.quantidadeG })),
        }];
      }))),
    };
    const buffer = await renderToBuffer(createElement(PlanoAlimentarPdf, { data }) as Parameters<typeof renderToBuffer>[0]);
    return { success: true, base64: buffer.toString("base64") };
  } catch {
    return { success: false, message: "Não foi possível gerar o PDF. Tente novamente em instantes." };
  }
}
