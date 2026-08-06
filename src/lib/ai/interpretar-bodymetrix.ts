import "server-only";
import { GoogleGenAI, FunctionCallingConfigMode } from "@google/genai";
import { z } from "zod";
import { DIRETRIZES_METODOLOGIA } from "./diretrizes-metodologia";

const interpretacaoSchema = z.object({
  interpretacao_clinica: z.string(),
  resumo_paciente_sugerido: z.string(),
});

export type InterpretacaoBodymetrix = z.infer<typeof interpretacaoSchema>;

const TOOL_NAME = "registrar_interpretacao";

const SYSTEM_PROMPT = `${DIRETRIZES_METODOLOGIA}

Você vai analisar um PDF de exame de composição corporal (Bodymetrix) e produzir DOIS textos:

1. "interpretacao_clinica": leitura técnica e completa dos resultados, para uso exclusivo do nutricionista. Pode (e deve) usar terminologia clínica, apontar valores fora de referência, tendências relevantes e possíveis pontos de atenção. Este texto NUNCA é mostrado ao paciente.

2. "resumo_paciente_sugerido": um rascunho de resumo simples e acolhedor, seguindo rigorosamente o tom de voz e a filosofia acima, para o caso do nutricionista decidir compartilhar com o paciente. Sem jargão técnico desnecessário, sem alarmismo, sem prometer resultados. O nutricionista sempre revisa este texto antes de liberar; você está apenas propondo um rascunho.

Baseie-se exclusivamente no conteúdo do PDF fornecido. Não invente valores que não estejam no documento.`;

/** Interpreta o PDF do Bodymetrix via Gemini (leitura nativa de
 * documento) e devolve os dois textos como saída estruturada; a IA nunca
 * decide sozinha o que fica visível ao paciente, isso é sempre uma ação
 * explícita do nutricionista (ver `disponibilizarAvaliacaoAction`). */
export async function interpretarBodymetrix(pdfBase64: string): Promise<InterpretacaoBodymetrix> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY não configurada. A interpretação por IA está desabilitada.");

  const ai = new GoogleGenAI({ apiKey });

  const response = await ai.models.generateContent({
    model: "gemini-3.6-flash",
    contents: [
      {
        role: "user",
        parts: [
          { inlineData: { mimeType: "application/pdf", data: pdfBase64 } },
          { text: "Analise este exame de composição corporal e registre a interpretação." },
        ],
      },
    ],
    config: {
      systemInstruction: SYSTEM_PROMPT,
      tools: [
        {
          functionDeclarations: [
            {
              name: TOOL_NAME,
              description: "Registra a interpretação clínica e o resumo sugerido para o paciente.",
              parametersJsonSchema: {
                type: "object",
                properties: {
                  interpretacao_clinica: { type: "string" },
                  resumo_paciente_sugerido: { type: "string" },
                },
                required: ["interpretacao_clinica", "resumo_paciente_sugerido"],
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
    throw new Error("A IA não retornou uma interpretação estruturada.");
  }

  const parsed = interpretacaoSchema.safeParse(call.args);
  if (!parsed.success) {
    throw new Error("A IA retornou um formato inesperado. Tente novamente.");
  }

  return parsed.data;
}
