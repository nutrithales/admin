import "server-only";
import { GoogleGenAI, FunctionCallingConfigMode } from "@google/genai";
import { z } from "zod";
import { DIRETRIZES_METODOLOGIA } from "./diretrizes-metodologia";

const itemSchema = z.object({
  nome_original: z.string(),
  alimento_id: z.string().nullable(),
  papel_macro: z.enum(["proteina", "carboidrato", "gordura", "livre"]),
});

const resultadoSchema = z.object({
  itens: z.array(itemSchema),
  observacao: z.string(),
});

export type MontagemTextoLivre = z.infer<typeof resultadoSchema>;

export interface AlimentoParaMatchTextoLivre {
  id: string;
  nome: string;
  sinonimos: string[];
}

const TOOL_NAME = "registrar_montagem";

const SYSTEM_PROMPT = `${DIRETRIZES_METODOLOGIA}

Você recebe uma lista de alimentos escrita livremente pelo nutricionista (separados por vírgula, quebra de linha, etc.) pra uma refeição específica de um plano. Sua tarefa tem duas partes:

1. Reconhecer cada alimento mencionado e casar contra a biblioteca já cadastrada (fornecida com id, nome e sinônimos). Regras obrigatórias:
   - Só preencha "alimento_id" com um id que esteja literalmente na lista fornecida, e só quando tiver razoável confiança de que é o mesmo alimento (pelo nome ou por um dos sinônimos). Se não achar, deixe "alimento_id" null — nunca invente um id.
   - "papel_macro": classifique cada alimento como proteina, carboidrato, gordura ou livre (tempero/folhas/vegetais que não entram no escalonamento de macro) com base no papel nutricional predominante dele.
   - Nunca calcule quantidade em gramas — isso não faz parte da sua tarefa, é sempre feito depois por um motor de escalonamento determinístico.

2. Escrever "observacao": uma nota curta e útil sobre essa refeição especificamente (dica de preparo, ordem de combinar os alimentos, timing, etc.), seguindo rigorosamente o tom de voz e a filosofia acima. Nunca invente informação nutricional nessa nota, só oriente sobre preparo/prática.

Nunca use travessão (—) em nenhum texto, em nenhuma circunstância. Prefira ponto, vírgula, dois pontos ou parênteses.`;

/** Reconhece alimentos escritos livremente pelo nutricionista pra uma
 * refeição e propõe o papel_macro de cada um, pra o motor de escalonamento
 * (`scaleRecipe`) determinístico calcular as quantidades depois; a IA
 * nunca calcula grama nem inventa um alimento fora da biblioteca já
 * cadastrada, mesmo princípio das outras funções de IA do construtor de
 * plano (`gerar-rascunho-plano.ts`, `importar-plano.ts`). */
export async function montarRefeicaoTextoLivre(params: {
  texto: string;
  nomeRefeicao: string;
  alimentos: AlimentoParaMatchTextoLivre[];
}): Promise<MontagemTextoLivre> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY não configurada. Essa função de IA está desabilitada.");

  const ai = new GoogleGenAI({ apiKey });

  const userPrompt = `Refeição: ${params.nomeRefeicao}

Alimentos escritos pelo nutricionista pra essa refeição:
${params.texto}

Alimentos já cadastrados na biblioteca (casar "alimento_id" só com estes, pelo id exato, incluindo pelos sinônimos):
${params.alimentos.map((a) => `- id: ${a.id} | nome: ${a.nome}${a.sinonimos.length ? ` | sinônimos: ${a.sinonimos.join(", ")}` : ""}`).join("\n") || "(nenhum alimento cadastrado ainda)"}`;

  const response = await ai.models.generateContent({
    model: "gemini-3.6-flash",
    contents: userPrompt,
    config: {
      systemInstruction: SYSTEM_PROMPT,
      tools: [
        {
          functionDeclarations: [
            {
              name: TOOL_NAME,
              description: "Registra os alimentos reconhecidos (com papel_macro) e a observação da refeição.",
              parametersJsonSchema: {
                type: "object",
                properties: {
                  itens: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        nome_original: { type: "string" },
                        alimento_id: { type: ["string", "null"] },
                        papel_macro: { type: "string", enum: ["proteina", "carboidrato", "gordura", "livre"] },
                      },
                      required: ["nome_original", "alimento_id", "papel_macro"],
                    },
                  },
                  observacao: { type: "string" },
                },
                required: ["itens", "observacao"],
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
    throw new Error("A IA não retornou uma montagem estruturada.");
  }

  const parsed = resultadoSchema.safeParse(call.args);
  if (!parsed.success) {
    throw new Error("A IA retornou um formato inesperado. Tente novamente.");
  }

  return parsed.data;
}
