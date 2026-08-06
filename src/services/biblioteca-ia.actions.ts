"use server";

import { revalidatePath } from "next/cache";
import { assertAdmin } from "@/lib/supabase/assert-admin";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/services/pacientes.actions";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { identificarTipoArquivo, mimeTypeDaImagem, extrairTextoDeDocx, extrairTextoDeHtml } from "@/lib/documentos/extrair-texto";
import { extrairConhecimento, type AlimentoNovoExtraido, type ConhecimentoExtraido } from "@/lib/ai/extrair-conhecimento";

const BUCKET = "biblioteca-documentos";
const MAX_SIZE_BYTES = 20 * 1024 * 1024; // 20MB

/** Normaliza nome pra comparação de duplicidade: minúsculo, sem acento,
 * sem espaço duplicado. Não é um match perfeito, mas evita a maioria dos
 * duplicados óbvios sem depender de uma extensão de similaridade no banco. */
function normalizar(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

interface Contadores {
  alimentosNovos: number;
  receitasNovas: number;
  receitasAtualizadas: number;
  refeicoesModeloNovas: number;
  refeicoesModeloAtualizadas: number;
  itensNaoReconhecidos: number;
}

function alimentoNovoToRow(a: AlimentoNovoExtraido) {
  return {
    nome: a.nome,
    origem: "ia_extracao",
    kcal_100g: a.kcal_100g,
    proteina_100g: a.proteina_100g,
    carboidrato_100g: a.carboidrato_100g,
    gordura_100g: a.gordura_100g,
    fibra_100g: a.fibra_100g,
    sodio_100g: a.sodio_100g,
    porcao_padrao_g: a.porcao_padrao_g,
    unidade_padrao: a.unidade_padrao || null,
    categoria: a.categoria,
    grupo_alimentar: a.grupo_alimentar,
    observacoes: a.observacoes,
    revisado_manualmente: false,
    ativo: true,
  };
}

/** Resolve um alimento pra um id real: usa o id já casado pela IA (se
 * válido), acha por nome normalizado num alimento já processado nesta
 * mesma importação, ou cria um novo (marcado `revisado_manualmente =
 * false`). Nunca inventa um id fora disso. */
async function resolverAlimento(
  supabase: SupabaseClient<Database>,
  alimentoId: string | null,
  alimentoNovo: AlimentoNovoExtraido | null,
  idsValidos: Set<string>,
  cacheNomes: Map<string, string>,
  contadores: Contadores,
): Promise<string | null> {
  if (alimentoId && idsValidos.has(alimentoId)) return alimentoId;
  if (!alimentoNovo || !alimentoNovo.nome.trim()) return null;

  const chave = normalizar(alimentoNovo.nome);
  const existente = cacheNomes.get(chave);
  if (existente) return existente;

  const { data, error } = await supabase.from("alimentos").insert(alimentoNovoToRow(alimentoNovo)).select("id").single();
  if (error || !data) return null;

  cacheNomes.set(chave, data.id);
  idsValidos.add(data.id);
  contadores.alimentosNovos++;
  return data.id;
}

interface IngredienteResolvido {
  alimento_id: string;
  quantidade_base_g: number;
  papel_macro: string;
}

/** Mesma lógica de resolução de alimento, mas pra uma receita: casa por id
 * válido, por nome normalizado já visto nesta importação, ou cria nova. Se
 * já existir uma receita com o mesmo nome, só atualiza se a versão extraída
 * for mais completa (mais ingredientes, ou tem modo de preparo que faltava)
 * — nunca sobrescreve dado bom com dado pior. */
async function resolverReceita(
  supabase: SupabaseClient<Database>,
  receitaId: string | null,
  receitaNova: ConhecimentoExtraido["refeicoes"][number]["itens"][number]["receita_nova"],
  idsValidosReceitas: Set<string>,
  cacheReceitaNomes: Map<string, string>,
  idsValidosAlimentos: Set<string>,
  cacheAlimentoNomes: Map<string, string>,
  contadores: Contadores,
): Promise<string | null> {
  if (receitaId && idsValidosReceitas.has(receitaId)) return receitaId;
  if (!receitaNova || receitaNova.ingredientes.length === 0) return null;

  const ingredientesResolvidos: IngredienteResolvido[] = [];
  for (const ing of receitaNova.ingredientes) {
    const alimentoIdResolvido = await resolverAlimento(supabase, ing.alimento_id, ing.alimento_novo, idsValidosAlimentos, cacheAlimentoNomes, contadores);
    if (alimentoIdResolvido) {
      ingredientesResolvidos.push({ alimento_id: alimentoIdResolvido, quantidade_base_g: ing.quantidade_base_g, papel_macro: ing.papel_macro });
    }
  }
  if (ingredientesResolvidos.length === 0) return null;

  const chave = normalizar(receitaNova.nome);
  const existenteId = cacheReceitaNomes.get(chave);

  if (existenteId) {
    const { data: atual } = await supabase
      .from("receitas")
      .select("modo_preparo, itens:receita_itens(id)")
      .eq("id", existenteId)
      .maybeSingle();
    const itensAtuais = atual?.itens?.length ?? 0;
    const maisCompleta = ingredientesResolvidos.length > itensAtuais || (!atual?.modo_preparo?.trim() && !!receitaNova.modo_preparo?.trim());
    if (!maisCompleta) return existenteId;

    await supabase.from("receita_itens").delete().eq("receita_id", existenteId);
    await supabase
      .from("receita_itens")
      .insert(ingredientesResolvidos.map((it, i) => ({ receita_id: existenteId, ...it, ordem: i })));
    await supabase
      .from("receitas")
      .update({ modo_preparo: receitaNova.modo_preparo || atual?.modo_preparo || null, revisado_manualmente: false })
      .eq("id", existenteId);
    contadores.receitasAtualizadas++;
    return existenteId;
  }

  const { data: nova, error } = await supabase
    .from("receitas")
    .insert({ nome: receitaNova.nome, modo_preparo: receitaNova.modo_preparo || null, tags: receitaNova.tags, revisado_manualmente: false })
    .select("id")
    .single();
  if (error || !nova) return null;

  await supabase.from("receita_itens").insert(ingredientesResolvidos.map((it, i) => ({ receita_id: nova.id, ...it, ordem: i })));

  cacheReceitaNomes.set(chave, nova.id);
  idsValidosReceitas.add(nova.id);
  contadores.receitasNovas++;
  return nova.id;
}

export interface ImportarDocumentoBibliotecaResult extends ActionResult {
  resumo?: Record<string, unknown>;
}

/** Importa qualquer documento (PDF/DOCX/HTML/TXT/imagem, ou texto colado)
 * e alimenta a biblioteca (alimentos, receitas, e refeições-modelo quando
 * não ligado a um paciente específico) automaticamente. Diferente do
 * "Importar plano" (que só popula um plano_estruturado específico casando
 * contra a biblioteca já existente, nunca criando nada novo), esta ação
 * PODE criar alimento/receita novos — sempre marcados
 * `revisado_manualmente = false`, numa fila de revisão, nunca como dado
 * "confiável" desde o início. Não popula plano_estruturado nem prontuário
 * automaticamente (isso continua manual/via "Importar plano"), pra não
 * arriscar gravar errado em cima de dado clínico sensível. */
export async function importarDocumentoBibliotecaAction(formData: FormData): Promise<ImportarDocumentoBibliotecaResult> {
  await assertAdmin();
  const supabase = await createClient();

  const arquivo = formData.get("arquivo") as File | null;
  const texto = (formData.get("texto") as string | null)?.trim();
  const authId = (formData.get("authId") as string | null)?.trim() || null;

  if ((!arquivo || arquivo.size === 0) && !texto) {
    return { success: false, message: "Envie um arquivo ou cole um texto." };
  }
  if (arquivo && arquivo.size > MAX_SIZE_BYTES) {
    return { success: false, message: "O arquivo deve ter até 20MB." };
  }

  let tipoArquivo: "pdf" | "docx" | "html" | "txt" | "imagem" = "txt";
  let nomeArquivo = "Texto colado";
  let path: string | null = null;
  let conteudo: { tipo: "pdf" | "imagem"; base64: string; mimeType: string } | { tipo: "texto"; texto: string };

  if (arquivo && arquivo.size > 0) {
    const tipoIdentificado = identificarTipoArquivo(arquivo.name);
    if (!tipoIdentificado) {
      return { success: false, message: "Formato não reconhecido. Envie PDF, DOCX, HTML, TXT ou imagem (PNG/JPG/HEIC/WEBP)." };
    }
    tipoArquivo = tipoIdentificado;
    nomeArquivo = arquivo.name;

    const buffer = Buffer.from(await arquivo.arrayBuffer());
    path = `${authId ?? "geral"}/${crypto.randomUUID()}-${arquivo.name}`;
    const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, buffer, { contentType: arquivo.type || undefined });
    if (uploadError) return { success: false, message: `Erro ao enviar arquivo: ${uploadError.message}` };

    if (tipoArquivo === "pdf") {
      conteudo = { tipo: "pdf", base64: buffer.toString("base64"), mimeType: "application/pdf" };
    } else if (tipoArquivo === "imagem") {
      conteudo = { tipo: "imagem", base64: buffer.toString("base64"), mimeType: mimeTypeDaImagem(arquivo.name) };
    } else if (tipoArquivo === "docx") {
      conteudo = { tipo: "texto", texto: await extrairTextoDeDocx(buffer) };
    } else if (tipoArquivo === "html") {
      conteudo = { tipo: "texto", texto: extrairTextoDeHtml(buffer.toString("utf-8")) };
    } else {
      conteudo = { tipo: "texto", texto: buffer.toString("utf-8") };
    }
  } else {
    conteudo = { tipo: "texto", texto: texto! };
  }

  const [{ data: alimentosCatalogo }, { data: receitasCatalogo }, { data: refeicoesCatalogo }] = await Promise.all([
    supabase.from("alimentos").select("id, nome, sinonimos").eq("ativo", true),
    supabase.from("receitas").select("id, nome, tags").eq("ativo", true),
    supabase.from("refeicoes_modelo").select("id, nome").eq("ativo", true),
  ]);

  let extraido: ConhecimentoExtraido;
  try {
    extraido = await extrairConhecimento({
      conteudo,
      alimentos: alimentosCatalogo ?? [],
      receitas: receitasCatalogo ?? [],
    });
  } catch (err) {
    const mensagem = err instanceof Error ? err.message : "Erro ao extrair conhecimento do documento.";
    await supabase.from("documentos_biblioteca").insert({ nome_arquivo: nomeArquivo, tipo_arquivo: tipoArquivo, bucket: BUCKET, path, auth_id: authId, status: "erro", erro_mensagem: mensagem });
    revalidatePath("/ia");
    return { success: false, message: mensagem };
  }

  const idsValidosAlimentos = new Set((alimentosCatalogo ?? []).map((a) => a.id));
  const idsValidosReceitas = new Set((receitasCatalogo ?? []).map((r) => r.id));
  const cacheAlimentoNomes = new Map((alimentosCatalogo ?? []).map((a) => [normalizar(a.nome), a.id]));
  const cacheReceitaNomes = new Map((receitasCatalogo ?? []).map((r) => [normalizar(r.nome), r.id]));
  const cacheRefeicaoNomes = new Map((refeicoesCatalogo ?? []).map((r) => [normalizar(r.nome), r.id]));

  const contadores: Contadores = {
    alimentosNovos: 0,
    receitasNovas: 0,
    receitasAtualizadas: 0,
    refeicoesModeloNovas: 0,
    refeicoesModeloAtualizadas: 0,
    itensNaoReconhecidos: 0,
  };

  for (const refeicaoExtraida of extraido.refeicoes) {
    const itensResolvidos: { alimento_id: string | null; receita_id: string | null; quantidade_g: number | null }[] = [];

    for (const item of refeicaoExtraida.itens) {
      if (item.tipo_match === "alimento_existente" || item.tipo_match === "alimento_novo") {
        const alimentoId = await resolverAlimento(supabase, item.alimento_id, item.alimento_novo, idsValidosAlimentos, cacheAlimentoNomes, contadores);
        if (alimentoId) itensResolvidos.push({ alimento_id: alimentoId, receita_id: null, quantidade_g: item.quantidade_g });
        else contadores.itensNaoReconhecidos++;
      } else if (item.tipo_match === "receita_existente" || item.tipo_match === "receita_nova") {
        const receitaId = await resolverReceita(
          supabase,
          item.receita_id,
          item.receita_nova,
          idsValidosReceitas,
          cacheReceitaNomes,
          idsValidosAlimentos,
          cacheAlimentoNomes,
          contadores,
        );
        if (receitaId) itensResolvidos.push({ alimento_id: null, receita_id: receitaId, quantidade_g: null });
        else contadores.itensNaoReconhecidos++;
      } else {
        contadores.itensNaoReconhecidos++;
      }
    }

    // Refeições-modelo (biblioteca geral) só são criadas/atualizadas quando o
    // documento NÃO está ligado a um paciente específico — histórico de um
    // paciente vira plano via "Importar plano" (tela do plano), não vira
    // template de biblioteca geral.
    if (!authId && itensResolvidos.length > 0) {
      const chave = normalizar(refeicaoExtraida.nome);
      let refeicaoModeloId = cacheRefeicaoNomes.get(chave);

      if (!refeicaoModeloId) {
        const { data: nova } = await supabase.from("refeicoes_modelo").insert({ nome: refeicaoExtraida.nome, tags: [] }).select("id").single();
        if (nova) {
          refeicaoModeloId = nova.id;
          cacheRefeicaoNomes.set(chave, nova.id);
          contadores.refeicoesModeloNovas++;
        }
      } else {
        contadores.refeicoesModeloAtualizadas++;
      }

      if (refeicaoModeloId) {
        const { count: opcoesExistentes } = await supabase
          .from("refeicao_modelo_opcoes")
          .select("id", { count: "exact", head: true })
          .eq("refeicao_modelo_id", refeicaoModeloId);

        const { data: opcao } = await supabase
          .from("refeicao_modelo_opcoes")
          .insert({ refeicao_modelo_id: refeicaoModeloId, nome: `Opção ${(opcoesExistentes ?? 0) + 1}`, observacoes: refeicaoExtraida.observacoes || null, ordem: opcoesExistentes ?? 0 })
          .select("id")
          .single();

        if (opcao) {
          await supabase.from("refeicao_modelo_opcao_itens").insert(
            itensResolvidos.map((it, i) => ({
              opcao_id: opcao.id,
              alimento_id: it.alimento_id,
              receita_id: it.receita_id,
              quantidade_g: it.alimento_id ? it.quantidade_g : null,
              ordem: i,
            })),
          );
        }
      }
    }
  }

  const resumo = {
    ...contadores,
    protocolos_identificados: extraido.protocolos_identificados.map((p) => p.nome),
    tem_observacoes_clinicas: !!extraido.observacoes_clinicas?.trim(),
    observacoes_clinicas: extraido.observacoes_clinicas,
  };

  await supabase.from("documentos_biblioteca").insert({
    nome_arquivo: nomeArquivo,
    tipo_arquivo: tipoArquivo,
    bucket: BUCKET,
    path,
    auth_id: authId,
    status: "concluido",
    resumo_extracao: resumo,
  });

  revalidatePath("/ia");
  revalidatePath("/alimentos");
  revalidatePath("/receitas");
  revalidatePath("/refeicoes");

  const partes = [
    contadores.alimentosNovos > 0 ? `${contadores.alimentosNovos} alimento(s) novo(s)` : null,
    contadores.receitasNovas > 0 ? `${contadores.receitasNovas} receita(s) nova(s)` : null,
    contadores.receitasAtualizadas > 0 ? `${contadores.receitasAtualizadas} receita(s) atualizada(s)` : null,
    contadores.refeicoesModeloNovas > 0 ? `${contadores.refeicoesModeloNovas} refeição(ões)-modelo nova(s)` : null,
  ].filter(Boolean);

  return {
    success: true,
    message: partes.length > 0 ? `Documento processado: ${partes.join(", ")}.` : "Documento processado, mas nada de novo foi reconhecido pra biblioteca.",
    resumo,
  };
}
