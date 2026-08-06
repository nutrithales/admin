import "server-only";
import { GoogleGenAI, FunctionCallingConfigMode } from "@google/genai";
import { z } from "zod";

const alimentoNovoSchema = z.object({
  nome: z.string(),
  categoria: z.string().nullable(),
  grupo_alimentar: z.string().nullable(),
  kcal_100g: z.number(),
  proteina_100g: z.number(),
  carboidrato_100g: z.number(),
  gordura_100g: z.number(),
  fibra_100g: z.number().nullable(),
  sodio_100g: z.number().nullable(),
  porcao_padrao_g: z.number().nullable(),
  unidade_padrao: z.string().nullable(),
  observacoes: z.string(),
});
export type AlimentoNovoExtraido = z.infer<typeof alimentoNovoSchema>;

const substituicaoSchema = z.object({
  nome: z.string(),
  quantidade_g: z.number().nullable(),
});

const ingredienteReceitaSchema = z.object({
  nome_original: z.string(),
  quantidade_base_g: z.number(),
  papel_macro: z.enum(["proteina", "carboidrato", "gordura", "livre"]),
  alimento_id: z.string().nullable(),
  alimento_novo: alimentoNovoSchema.nullable(),
});

const receitaNovaSchema = z.object({
  nome: z.string(),
  modo_preparo: z.string().nullable(),
  tags: z.array(z.string()),
  ingredientes: z.array(ingredienteReceitaSchema),
});
export type ReceitaNovaExtraida = z.infer<typeof receitaNovaSchema>;

const itemRefeicaoSchema = z.object({
  nome_original: z.string(),
  quantidade_g: z.number().nullable(),
  tipo_match: z.enum(["alimento_existente", "alimento_novo", "receita_existente", "receita_nova", "nao_reconhecido"]),
  alimento_id: z.string().nullable(),
  receita_id: z.string().nullable(),
  alimento_novo: alimentoNovoSchema.nullable(),
  receita_nova: receitaNovaSchema.nullable(),
  substituicoes: z.array(substituicaoSchema),
});

const refeicaoExtraidaSchema = z.object({
  nome: z.string(),
  observacoes: z.string().nullable(),
  itens: z.array(itemRefeicaoSchema),
});

const conhecimentoExtraidoSchema = z.object({
  refeicoes: z.array(refeicaoExtraidaSchema),
  observacoes_clinicas: z.string().nullable(),
  protocolos_identificados: z.array(z.object({ nome: z.string(), descricao: z.string().nullable() })),
});
export type ConhecimentoExtraido = z.infer<typeof conhecimentoExtraidoSchema>;

export interface AlimentoParaMatch {
  id: string;
  nome: string;
  sinonimos: string[];
}

export interface ReceitaParaMatch {
  id: string;
  nome: string;
  tags: string[];
}

const TOOL_NAME = "registrar_conhecimento_extraido";

const alimentoNovoJsonSchema = {
  type: "object",
  properties: {
    nome: { type: "string" },
    categoria: { type: ["string", "null"] },
    grupo_alimentar: { type: ["string", "null"] },
    kcal_100g: { type: "number" },
    proteina_100g: { type: "number" },
    carboidrato_100g: { type: "number" },
    gordura_100g: { type: "number" },
    fibra_100g: { type: ["number", "null"] },
    sodio_100g: { type: ["number", "null"] },
    porcao_padrao_g: { type: ["number", "null"] },
    unidade_padrao: { type: ["string", "null"] },
    observacoes: { type: "string" },
  },
  required: [
    "nome",
    "categoria",
    "grupo_alimentar",
    "kcal_100g",
    "proteina_100g",
    "carboidrato_100g",
    "gordura_100g",
    "fibra_100g",
    "sodio_100g",
    "porcao_padrao_g",
    "unidade_padrao",
    "observacoes",
  ],
} as const;

const SYSTEM_PROMPT = `Você lê um documento (plano alimentar, receita, material nutricional) e extrai TUDO que ele contém pra alimentar uma biblioteca estruturada. Isso é reconhecimento e organização do que já está escrito, não invenção de conteúdo novo.

Regras obrigatórias, sem exceção:
- "quantidade_g"/"quantidade_base_g": use só o valor em gramas/ml explícito no documento. Nunca calcule ou converta uma quantidade que não esteja escrita.
- Pra cada alimento ou receita mencionado, primeiro tente casar contra a biblioteca já cadastrada (listas fornecidas, incluindo sinônimos). Só use "alimento_id"/"receita_id" com um id que esteja literalmente nas listas fornecidas.
- Se não achar na biblioteca, proponha um alimento novo ("alimento_novo") ou receita nova ("receita_nova") com os dados nutricionais que o documento realmente informa. Se o documento não der o valor de algum nutriente, estime com seu conhecimento geral de tabelas de composição, mas deixe isso claro em "observacoes" (nunca finja precisão que você não tem).
- "papel_macro" de cada ingrediente de uma receita nova: classifique como proteina, carboidrato, gordura ou livre (tempero/folhas que não entram no escalonamento) com base no papel nutricional predominante do alimento.
- "substituicoes": inclua só as opções de troca explicitamente mencionadas no documento pra aquele item específico.
- "observacoes" de cada refeição: dicas de preparo e observações nutricionais mencionadas no documento, resumidas fielmente.
- "observacoes_clinicas": qualquer anotação de acompanhamento clínico do paciente que apareça no documento (fora do que já vira observação de refeição). Null se não houver.
- "protocolos_identificados": só inclua se o documento nomear/descrever explicitamente uma metodologia ou protocolo (ex.: "Protocolo de Emagrecimento Fase 1"). Não invente um nome de protocolo que não esteja no documento.
- Ignore cabeçalho/rodapé, marca d'água, QR code, texto de navegação (ex.: "Acesse o app", número de página).
- Nunca use travessão (—) em nenhum texto, em nenhuma circunstância. Prefira ponto, vírgula, dois pontos ou parênteses.`;

/** Extrai o conhecimento de um documento (plano, receita, material
 * nutricional) pra alimentar a biblioteca automaticamente. Ao contrário das
 * outras funções de IA do sistema, esta PODE propor alimentos/receitas
 * novos (não só casar contra a biblioteca já existente) — quem grava
 * (`importarDocumentoBibliotecaAction`) sempre marca esses itens como
 * `revisado_manualmente = false`, numa fila de revisão, nunca direto como
 * dado "confiável" desde o início. */
export async function extrairConhecimento(params: {
  conteudo: { tipo: "pdf" | "imagem"; base64: string; mimeType: string } | { tipo: "texto"; texto: string };
  alimentos: AlimentoParaMatch[];
  receitas: ReceitaParaMatch[];
}): Promise<ConhecimentoExtraido> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY não configurada. A extração por IA está desabilitada.");

  const ai = new GoogleGenAI({ apiKey });

  const contexto = `Alimentos já cadastrados na biblioteca (casar "alimento_id" só com estes, pelo id exato, incluindo pelos sinônimos listados):
${params.alimentos.map((a) => `- id: ${a.id} | nome: ${a.nome}${a.sinonimos.length ? ` | sinônimos: ${a.sinonimos.join(", ")}` : ""}`).join("\n") || "(nenhum alimento cadastrado ainda)"}

Receitas já cadastradas na biblioteca (casar "receita_id" só com estas, pelo id exato):
${params.receitas.map((r) => `- id: ${r.id} | nome: ${r.nome} | tags: ${r.tags.join(", ") || "sem tags"}`).join("\n") || "(nenhuma receita cadastrada ainda)"}`;

  const parts =
    params.conteudo.tipo === "texto"
      ? [{ text: `${contexto}\n\nExtraia o conhecimento do texto abaixo:\n\n${params.conteudo.texto}` }]
      : [
          { inlineData: { mimeType: params.conteudo.mimeType, data: params.conteudo.base64 } },
          { text: `${contexto}\n\nExtraia o conhecimento deste documento.` },
        ];

  const response = await ai.models.generateContent({
    model: "gemini-3.6-flash",
    contents: [{ role: "user", parts }],
    config: {
      systemInstruction: SYSTEM_PROMPT,
      tools: [
        {
          functionDeclarations: [
            {
              name: TOOL_NAME,
              description: "Registra tudo que foi reconhecido no documento.",
              parametersJsonSchema: {
                type: "object",
                properties: {
                  refeicoes: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        nome: { type: "string" },
                        observacoes: { type: ["string", "null"] },
                        itens: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              nome_original: { type: "string" },
                              quantidade_g: { type: ["number", "null"] },
                              tipo_match: {
                                type: "string",
                                enum: ["alimento_existente", "alimento_novo", "receita_existente", "receita_nova", "nao_reconhecido"],
                              },
                              alimento_id: { type: ["string", "null"] },
                              receita_id: { type: ["string", "null"] },
                              alimento_novo: { anyOf: [alimentoNovoJsonSchema, { type: "null" }] },
                              receita_nova: {
                                anyOf: [
                                  {
                                    type: "object",
                                    properties: {
                                      nome: { type: "string" },
                                      modo_preparo: { type: ["string", "null"] },
                                      tags: { type: "array", items: { type: "string" } },
                                      ingredientes: {
                                        type: "array",
                                        items: {
                                          type: "object",
                                          properties: {
                                            nome_original: { type: "string" },
                                            quantidade_base_g: { type: "number" },
                                            papel_macro: { type: "string", enum: ["proteina", "carboidrato", "gordura", "livre"] },
                                            alimento_id: { type: ["string", "null"] },
                                            alimento_novo: { anyOf: [alimentoNovoJsonSchema, { type: "null" }] },
                                          },
                                          required: ["nome_original", "quantidade_base_g", "papel_macro", "alimento_id", "alimento_novo"],
                                        },
                                      },
                                    },
                                    required: ["nome", "modo_preparo", "tags", "ingredientes"],
                                  },
                                  { type: "null" },
                                ],
                              },
                              substituicoes: {
                                type: "array",
                                items: {
                                  type: "object",
                                  properties: { nome: { type: "string" }, quantidade_g: { type: ["number", "null"] } },
                                  required: ["nome", "quantidade_g"],
                                },
                              },
                            },
                            required: ["nome_original", "quantidade_g", "tipo_match", "alimento_id", "receita_id", "alimento_novo", "receita_nova", "substituicoes"],
                          },
                        },
                      },
                      required: ["nome", "observacoes", "itens"],
                    },
                  },
                  observacoes_clinicas: { type: ["string", "null"] },
                  protocolos_identificados: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: { nome: { type: "string" }, descricao: { type: ["string", "null"] } },
                      required: ["nome", "descricao"],
                    },
                  },
                },
                required: ["refeicoes", "observacoes_clinicas", "protocolos_identificados"],
              },
            },
          ],
        },
      ],
      toolConfig: { functionCallingConfig: { mode: FunctionCallingConfigMode.ANY, allowedFunctionNames: [TOOL_NAME] } },
    },
  });

  const call = response.functionCalls?.[0];
  if (!call?.args) {
    throw new Error("A IA não retornou uma extração estruturada.");
  }

  const parsed = conhecimentoExtraidoSchema.safeParse(call.args);
  if (!parsed.success) {
    throw new Error("A IA retornou um formato inesperado. Tente novamente.");
  }

  return parsed.data;
}
