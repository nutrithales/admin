export interface MensagemVariaveis {
  primeiro_nome?: string;
  data?: string;
  horario?: string;
  tipo_consulta?: string;
  local_ou_link?: string;
  plano?: string;
  consultas_realizadas?: string | number;
  consultas_restantes?: string | number;
}

const PLACEHOLDER = /\{\{\s*(\w+)\s*\}\}/g;

/** Preenche um modelo de mensagem com os dados reais do paciente/consulta.
 * Placeholders sem valor disponível ficam com um marcador visível — a
 * mensagem é sempre preparada para revisão humana antes do envio, nunca
 * enviada automaticamente. */
export function fillTemplate(corpo: string, variaveis: MensagemVariaveis): string {
  return corpo.replace(PLACEHOLDER, (_match, key: string) => {
    const value = variaveis[key as keyof MensagemVariaveis];
    return value === undefined || value === null || value === "" ? `[${key}]` : String(value);
  });
}

export function primeiroNome(nomeCompleto?: string | null): string {
  return (nomeCompleto ?? "").trim().split(/\s+/)[0] ?? "";
}
