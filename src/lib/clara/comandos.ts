/**
 * Interpretação de comandos por palavra-chave — funciona sem depender de
 * nenhuma API de IA paga. A arquitetura fica pronta para, no futuro, um
 * fallback opcional de IA tentar interpretar comandos que não batam com
 * nenhuma regra aqui (ver `interpretarComando`), mas todo comando
 * essencial precisa continuar funcionando só com estas regras.
 */
export type ComandoIntencao =
  | "organizar_dia"
  | "agenda_amanha"
  | "sem_proxima_consulta"
  | "renovar_plano"
  | "checkin_pendente"
  | "preparar_confirmacoes_amanha"
  | "resumir_pendencias"
  | "aguardando_plano"
  | "parados_fluxo"
  | "preparar_mensagem_renovacao"
  | "ultima_consulta_plano"
  | "ajuda";

export interface ComandoInterpretado {
  intencao: ComandoIntencao;
  pacienteBusca?: string;
}

// Marcas de acentuação combinantes (resultado de normalize("NFD")) — usa
// \u para evitar depender de caracteres invisíveis no código-fonte.
const DIACRITICOS = new RegExp("[\\u0300-\\u036f]", "g");

function normalizar(texto: string): string {
  return texto.toLocaleLowerCase("pt-BR").normalize("NFD").replace(DIACRITICOS, "").trim();
}

function contemTodas(texto: string, palavras: string[]): boolean {
  return palavras.every((palavra) => texto.includes(palavra));
}

interface Regra {
  intencao: ComandoIntencao;
  gruposDePalavras: string[][];
}

const REGRAS: Regra[] = [
  { intencao: "organizar_dia", gruposDePalavras: [["organiz", "dia"], ["resumo", "dia"], ["resumo do dia"]] },
  { intencao: "agenda_amanha", gruposDePalavras: [["agenda", "amanha"], ["consultas", "amanha"]] },
  { intencao: "sem_proxima_consulta", gruposDePalavras: [["sem", "proxima", "consulta"]] },
  { intencao: "renovar_plano", gruposDePalavras: [["renovar", "plano"], ["renovacao", "plano"]] },
  { intencao: "checkin_pendente", gruposDePalavras: [["checkin", "nao", "respond"], ["check-in", "nao", "respond"], ["check in", "nao", "respond"]] },
  {
    intencao: "preparar_confirmacoes_amanha",
    gruposDePalavras: [["mensagens", "confirmacao", "amanha"], ["confirmacoes", "amanha"]],
  },
  { intencao: "resumir_pendencias", gruposDePalavras: [["pendencias"], ["resuma", "pendencia"]] },
  { intencao: "aguardando_plano", gruposDePalavras: [["aguardando", "plano", "aliment"]] },
  { intencao: "parados_fluxo", gruposDePalavras: [["parad", "fluxo"]] },
  { intencao: "preparar_mensagem_renovacao", gruposDePalavras: [["mensagem", "renovacao"], ["renovacao", "para"]] },
  { intencao: "ultima_consulta_plano", gruposDePalavras: [["ultima", "consulta", "plano"], ["chegando", "ultima", "consulta"]] },
];

/** Tenta extrair um nome de paciente citado depois de "para" — usado no
 * comando "prepare uma mensagem de renovação para <nome>". */
function extrairPacienteBusca(textoOriginal: string): string | undefined {
  const match = /\bpara\s+(.+)$/i.exec(textoOriginal.trim());
  const nome = match?.[1];
  if (!nome) return undefined;
  return nome.replace(/[.?!]+$/, "").trim() || undefined;
}

export function interpretarComando(textoOriginal: string): ComandoInterpretado {
  const texto = normalizar(textoOriginal);

  for (const regra of REGRAS) {
    const bateu = regra.gruposDePalavras.some((palavras) => contemTodas(texto, palavras));
    if (bateu) {
      return {
        intencao: regra.intencao,
        pacienteBusca:
          regra.intencao === "preparar_mensagem_renovacao" ? extrairPacienteBusca(textoOriginal) : undefined,
      };
    }
  }

  return { intencao: "ajuda" };
}

export const COMANDOS_SUGERIDOS = [
  "Clara, organize meu dia.",
  "Mostre minha agenda de amanhã.",
  "Quais pacientes estão sem próxima consulta?",
  "Quem precisa renovar o plano?",
  "Quais pacientes ainda não responderam ao check-in?",
  "Prepare as mensagens de confirmação de amanhã.",
  "Resuma as pendências do consultório.",
  "Mostre os pacientes aguardando plano alimentar.",
  "Quais pacientes estão parados no fluxo?",
  "Mostre os pacientes chegando à última consulta do plano.",
];
