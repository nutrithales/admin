import "server-only";
import Anthropic from "@anthropic-ai/sdk";
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

1. "interpretacao_clinica": leitura técnica e completa dos resultados, para uso exclusivo do nutricionista — pode (e deve) usar terminologia clínica, apontar valores fora de referência, tendências relevantes e possíveis pontos de atenção. Este texto NUNCA é mostrado ao paciente.

2. "resumo_paciente_sugerido": um rascunho de resumo simples e acolhedor, seguindo rigorosamente o tom de voz e a filosofia acima, para o caso do nutricionista decidir compartilhar com o paciente — sem jargão técnico desnecessário, sem alarmismo, sem prometer resultados. O nutricionista sempre revisa este texto antes de liberar; você está apenas propondo um rascunho.

Baseie-se exclusivamente no conteúdo do PDF fornecido — não invente valores que não estejam no documento.`;

/** Interpreta o PDF do Bodymetrix via Claude (leitura nativa de
 * documento) e devolve os dois textos como saída estruturada — a IA nunca
 * decide sozinha o que fica visível ao paciente, isso é sempre uma ação
 * explícita do nutricionista (ver `disponibilizarAvaliacaoAction`). */
export async function interpretarBodymetrix(pdfBase64: string): Promise<InterpretacaoBodymetrix> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY não configurada — a interpretação por IA está desabilitada.");

  const client = new Anthropic({ apiKey });

  const message = await client.messages.create({
    model: "claude-sonnet-5",
    max_tokens: 3000,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: [
          { type: "document", source: { type: "base64", media_type: "application/pdf", data: pdfBase64 } },
          { type: "text", text: "Analise este exame de composição corporal e registre a interpretação." },
        ],
      },
    ],
    tools: [
      {
        name: TOOL_NAME,
        description: "Registra a interpretação clínica e o resumo sugerido para o paciente.",
        input_schema: {
          type: "object",
          properties: {
            interpretacao_clinica: { type: "string" },
            resumo_paciente_sugerido: { type: "string" },
          },
          required: ["interpretacao_clinica", "resumo_paciente_sugerido"],
        },
      },
    ],
    tool_choice: { type: "tool", name: TOOL_NAME },
  });

  const toolUse = message.content.find((block) => block.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error("A IA não retornou uma interpretação estruturada.");
  }

  const parsed = interpretacaoSchema.safeParse(toolUse.input);
  if (!parsed.success) {
    throw new Error("A IA retornou um formato inesperado — tente novamente.");
  }

  return parsed.data;
}
