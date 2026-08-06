import "server-only";
import { GoogleGenAI, FunctionCallingConfigMode } from "@google/genai";
import { z } from "zod";

const itemExtraidoSchema = z.object({
  nome_original: z.string(),
  /** Gramas indicadas (ou claramente dedutíveis, ex.: "(100g)" no texto) no
   * documento de origem — nunca uma estimativa da IA. Null quando o
   * documento não deixa isso explícito. */
  quantidade_g: z.number().nullable(),
  tipo_match: z.enum(["alimento", "nao_encontrado"]),
  alimento_id: z.string().nullable(),
});

const refeicaoExtraidaSchema = z.object({
  nome_slot: z.string(),
  observacoes: z.string().nullable(),
  itens: z.array(itemExtraidoSchema),
});

const planoExtraidoSchema = z.object({
  refeicoes: z.array(refeicaoExtraidaSchema),
});

export type PlanoExtraido = z.infer<typeof planoExtraidoSchema>;

export interface AlimentoParaMatch {
  id: string;
  nome: string;
}

const TOOL_NAME = "registrar_plano_extraido";

const SYSTEM_PROMPT = `Você recebe um plano alimentar já pronto, vindo de outro sistema (PDF exportado ou texto colado), e precisa extrair sua estrutura pra importar no sistema atual. Isso é EXTRAÇÃO, não geração — o plano já existe, você só está lendo e organizando o que já está escrito.

Regras obrigatórias, sem exceção:
- "quantidade_g": use APENAS o valor em gramas/ml que já está explícito no documento (ex.: "Ovo de galinha 2 Unidade(s) (100g)" → 100). Nunca calcule, estime ou converta uma quantidade que não esteja escrita — se o documento não der o peso em gramas de forma clara, deixe null.
- "nome_slot": use EXATAMENTE uma das strings da lista de horários fornecida (a mesma grafia) — escolha a mais próxima do horário/refeição do documento original. Nunca invente um nome de horário fora da lista.
- "alimento_id": só preencha com um id que esteja literalmente na lista de alimentos fornecida, e só quando você tiver razoável confiança de que é o mesmo alimento (ex.: "Peito de frango grelhado" do documento bate com "Frango, peito, sem pele, grelhado" da lista). Se não tiver certeza ou o alimento não existir na lista, deixe "alimento_id" null e "tipo_match": "nao_encontrado" — nunca invente um id.
- "observacoes": reúna dicas de preparo, observações nutricionais e opções de substituição mencionadas para aquela refeição num texto corrido, fiel ao que está escrito (pode resumir, mas não invente conselhos que não estejam no documento). Esse texto entra no PDF do paciente.
- Ignore cabeçalho/rodapé, marca d'água, QR code, texto de navegação do PDF (ex.: "Acesse o app", número de página); extraia só o conteúdo do plano alimentar em si.
- Nunca use travessão (—) em nenhum texto, em nenhuma circunstância. Prefira ponto, vírgula, dois pontos ou parênteses.`;

/** Extrai a estrutura de um plano alimentar já pronto (PDF ou texto), pra
 * importar/converter pro formato deste sistema. Só é permitido usar
 * quantidades já explícitas no documento (nunca calcula) e só é permitido
 * casar um item com um alimento que já exista na biblioteca cadastrada
 * (nunca inventa alimento) — mesmo princípio de "IA assistente, nunca
 * autônoma" das outras funções de IA do sistema; a materialização final
 * no plano é sempre feita pela action, revalidando cada id contra o banco. */
export async function importarPlano(params: {
  conteudo: { tipo: "pdf"; base64: string } | { tipo: "texto"; texto: string };
  slots: string[];
  alimentos: AlimentoParaMatch[];
}): Promise<PlanoExtraido> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY não configurada. A importação por IA está desabilitada.");

  const ai = new GoogleGenAI({ apiKey });

  const contexto = `Horários disponíveis neste plano (use "nome_slot" com uma dessas strings, exatamente):
${params.slots.map((s) => `- ${s}`).join("\n")}

Alimentos já cadastrados na biblioteca (escolha "alimento_id" só entre estes, pelo id exato, ou deixe null):
${params.alimentos.map((a) => `- id: ${a.id} | nome: ${a.nome}`).join("\n") || "(nenhum alimento cadastrado ainda)"}`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [
      {
        role: "user",
        parts:
          params.conteudo.tipo === "pdf"
            ? [
                { inlineData: { mimeType: "application/pdf", data: params.conteudo.base64 } },
                { text: `${contexto}\n\nExtraia a estrutura do plano alimentar deste PDF.` },
              ]
            : [{ text: `${contexto}\n\nExtraia a estrutura do plano alimentar do texto abaixo:\n\n${params.conteudo.texto}` }],
      },
    ],
    config: {
      systemInstruction: SYSTEM_PROMPT,
      tools: [
        {
          functionDeclarations: [
            {
              name: TOOL_NAME,
              description: "Registra a estrutura extraída do plano alimentar.",
              parametersJsonSchema: {
                type: "object",
                properties: {
                  refeicoes: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        nome_slot: { type: "string" },
                        observacoes: { type: ["string", "null"] },
                        itens: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              nome_original: { type: "string" },
                              quantidade_g: { type: ["number", "null"] },
                              tipo_match: { type: "string", enum: ["alimento", "nao_encontrado"] },
                              alimento_id: { type: ["string", "null"] },
                            },
                            required: ["nome_original", "quantidade_g", "tipo_match", "alimento_id"],
                          },
                        },
                      },
                      required: ["nome_slot", "observacoes", "itens"],
                    },
                  },
                },
                required: ["refeicoes"],
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

  const parsed = planoExtraidoSchema.safeParse(call.args);
  if (!parsed.success) {
    throw new Error("A IA retornou um formato inesperado. Tente novamente.");
  }

  return parsed.data;
}
