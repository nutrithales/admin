import "server-only";
import { GoogleGenAI, FunctionCallingConfigMode } from "@google/genai";
import { z } from "zod";

const alimentoEstimadoSchema = z.object({
  nome: z.string(),
  categoria: z.string().nullable(),
  grupo_alimentar: z.string().nullable(),
  kcal_100g: z.number(),
  proteina_100g: z.number(),
  carboidrato_100g: z.number(),
  gordura_100g: z.number(),
  fibra_100g: z.number().nullable(),
  porcao_padrao_g: z.number().nullable(),
  unidade_padrao: z.string().nullable(),
  observacoes: z.string(),
});

export type AlimentoEstimado = z.infer<typeof alimentoEstimadoSchema>;

const TOOL_NAME = "registrar_estimativa";

const SYSTEM_PROMPT = `Você ajuda um nutricionista a cadastrar rapidamente um alimento que ainda não está na base de dados (TBCA 7.3, fabricante, Tucunduva, USDA, FAO ou cadastro manual).

Estime a composição nutricional típica por 100g do alimento descrito, usando seu conhecimento geral de tabelas de composição de alimentos (se for um produto de marca conhecida, use os valores típicos do rótulo daquele tipo de produto).

Regras importantes:
- Isso é sempre uma ESTIMATIVA de partida; o nutricionista sempre revisa e ajusta antes de salvar. Nunca finja precisão que você não tem.
- No campo "observacoes", deixe claro que os valores são uma estimativa da IA e devem ser conferidos contra o rótulo ou uma tabela oficial antes de uso clínico.
- "grupo_alimentar" deve ser um destes valores (ou null se não se aplicar claramente): fruta, vegetal_a, vegetal_b, cereal, tuberculo, leguminosa, proteina_animal, laticinio, gordura, acucar_doce, bebida, suplemento.
- Se não conseguir estimar com confiança razoável, ainda assim preencha os campos numéricos com sua melhor estimativa (nunca deixe null), mas deixe isso bem explícito nas observações.
- Nunca use travessão (—) em nenhum texto, em nenhuma circunstância. Prefira ponto, vírgula, dois pontos ou parênteses.`;

/** Estima a composição nutricional de um alimento não cadastrado, pra
 * pré-preencher o formulário; nunca salva nada sozinha, sempre volta
 * como rascunho revisável (mesmo princípio de "IA assistente, nunca
 * autônoma" das outras funções de IA do sistema). */
export async function buscarAlimentoComIA(nomeAlimento: string): Promise<AlimentoEstimado> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY não configurada. A busca por IA está desabilitada.");

  const ai = new GoogleGenAI({ apiKey });

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: `Estime a composição nutricional de: ${nomeAlimento}`,
    config: {
      systemInstruction: SYSTEM_PROMPT,
      tools: [
        {
          functionDeclarations: [
            {
              name: TOOL_NAME,
              description: "Registra a estimativa de composição nutricional do alimento.",
              parametersJsonSchema: {
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
                  "porcao_padrao_g",
                  "unidade_padrao",
                  "observacoes",
                ],
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
    throw new Error("A IA não retornou uma estimativa estruturada.");
  }

  const parsed = alimentoEstimadoSchema.safeParse(call.args);
  if (!parsed.success) {
    throw new Error("A IA retornou um formato inesperado. Tente novamente.");
  }

  return parsed.data;
}
