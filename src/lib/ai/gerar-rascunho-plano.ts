import "server-only";
import { GoogleGenAI, FunctionCallingConfigMode } from "@google/genai";
import { z } from "zod";
import { DIRETRIZES_METODOLOGIA } from "./diretrizes-metodologia";

const rascunhoSchema = z.object({
  refeicoes: z.array(
    z.object({
      nome_slot: z.string(),
      receita_ids: z.array(z.string()),
    }),
  ),
});

export type RascunhoPlano = z.infer<typeof rascunhoSchema>;

export interface CatalogoReceita {
  id: string;
  nome: string;
  tags: string[];
}

export interface SlotPlano {
  nome: string;
  meta_kcal: number | null;
}

export interface PerfilPaciente {
  nome: string;
  peso_kg: number | null;
  altura_cm: number | null;
  objetivo: string | null;
  nivel_atividade: string | null;
  restricoes_alimentares: string[];
  preferencias_alimentares: string | null;
}

export interface MetasPlano {
  kcal: number | null;
  proteina_g: number | null;
  carboidrato_g: number | null;
  gordura_g: number | null;
}

const TOOL_NAME = "registrar_rascunho";

const SYSTEM_PROMPT = `${DIRETRIZES_METODOLOGIA}

Você monta o PRIMEIRO RASCUNHO de um plano alimentar — o nutricionista sempre revisa e ajusta tudo depois de você. Regras obrigatórias, sem exceção:

- Escolha receitas APENAS da lista fornecida, usando o campo "id" exatamente como está escrito. Nunca invente uma receita ou um id que não esteja na lista — se a lista não tiver nada adequado, escolha a opção menos ruim da própria lista, nunca invente.
- Nunca calcule quantidades em gramas — isso é sempre feito depois por um motor de escalonamento determinístico, você só escolhe QUAIS receitas entram em cada horário.
- Use "nome_slot" exatamente como aparece na lista de horários fornecida (mesma grafia).
- Escolha 1 ou 2 receitas por horário — priorize receitas cujas tags combinem com o tipo de refeição (ex.: tag "café-da-manhã" pro horário de café da manhã) e respeitem as restrições/preferências do paciente.
- Nunca deixe um horário sem nenhuma receita.`;

/** Gera o primeiro rascunho de um plano — a IA só escolhe QUAIS receitas
 * (sempre da biblioteca já cadastrada) entram em cada horário; o QUANTO
 * é sempre calculado depois pelo `scaleRecipe` determinístico, nunca
 * pela IA. Mesmo princípio de "assistente, nunca autônoma" das outras
 * funções de IA do sistema. */
export async function gerarRascunhoPlano(params: {
  paciente: PerfilPaciente;
  slots: SlotPlano[];
  receitas: CatalogoReceita[];
  metas: MetasPlano;
  instrucoesExtras?: string | null;
}): Promise<RascunhoPlano> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY não configurada. A geração de rascunho por IA está desabilitada.");
  if (params.receitas.length === 0) {
    throw new Error("Não há receitas ativas na biblioteca. Cadastre receitas em /receitas antes de gerar um rascunho.");
  }

  const ai = new GoogleGenAI({ apiKey });

  const userPrompt = `Paciente: ${params.paciente.nome}
Peso: ${params.paciente.peso_kg ?? "não informado"} kg
Altura: ${params.paciente.altura_cm ?? "não informado"} cm
Objetivo: ${params.paciente.objetivo ?? "não informado"}
Nível de atividade: ${params.paciente.nivel_atividade ?? "não informado"}
Restrições alimentares: ${params.paciente.restricoes_alimentares.join(", ") || "nenhuma"}
Preferências: ${params.paciente.preferencias_alimentares ?? "nenhuma"}

Metas diárias: ${params.metas.kcal ?? "não definida"} kcal, ${params.metas.proteina_g ?? "?"}g proteína, ${params.metas.carboidrato_g ?? "?"}g carboidrato, ${params.metas.gordura_g ?? "?"}g gordura
${params.instrucoesExtras ? `\nInstruções extras do nutricionista: ${params.instrucoesExtras}\n` : ""}
Horários deste plano (use "nome_slot" com essa grafia exata):
${params.slots.map((s) => `- ${s.nome}${s.meta_kcal != null ? ` (meta: ${s.meta_kcal} kcal)` : ""}`).join("\n")}

Receitas disponíveis na biblioteca (escolha só destas, pelo id exato):
${params.receitas.map((r) => `- id: ${r.id} | nome: ${r.nome} | tags: ${r.tags.join(", ") || "sem tags"}`).join("\n")}`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: userPrompt,
    config: {
      systemInstruction: SYSTEM_PROMPT,
      tools: [
        {
          functionDeclarations: [
            {
              name: TOOL_NAME,
              description: "Registra o rascunho do plano: quais receitas entram em cada horário.",
              parametersJsonSchema: {
                type: "object",
                properties: {
                  refeicoes: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        nome_slot: { type: "string" },
                        receita_ids: { type: "array", items: { type: "string" } },
                      },
                      required: ["nome_slot", "receita_ids"],
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
    throw new Error("A IA não retornou um rascunho estruturado.");
  }

  const parsed = rascunhoSchema.safeParse(call.args);
  if (!parsed.success) {
    throw new Error("A IA retornou um formato inesperado. Tente novamente.");
  }

  return parsed.data;
}
