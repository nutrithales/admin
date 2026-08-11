/**
 * Etapas do Fluxo de pacientes. `pacientes.fluxo_estagio` é texto livre no
 * banco (mesmo padrão de `biblioteca.tipo`) — a lista canônica e a ordem
 * de exibição vivem aqui, para adicionar/renomear etapas sem migration.
 */
export const FLUXO_ESTAGIOS = [
  "novo_lead",
  "contato_iniciado",
  "consulta_agendada",
  "primeira_consulta_realizada",
  "aguardando_plano_alimentar",
  "plano_entregue",
  "acompanhamento_ativo",
  "aguardando_checkin",
  "aguardando_retorno",
  "renovacao_proxima",
  "aguardando_renovacao",
  "pausado",
  "alta_inativo",
] as const;

export type FluxoEstagio = (typeof FLUXO_ESTAGIOS)[number];

export const FLUXO_ESTAGIO_LABEL: Record<FluxoEstagio, string> = {
  novo_lead: "Novo lead",
  contato_iniciado: "Contato iniciado",
  consulta_agendada: "Consulta agendada",
  primeira_consulta_realizada: "Primeira consulta realizada",
  aguardando_plano_alimentar: "Aguardando plano alimentar",
  plano_entregue: "Plano entregue",
  acompanhamento_ativo: "Acompanhamento ativo",
  aguardando_checkin: "Aguardando check-in",
  aguardando_retorno: "Aguardando retorno",
  renovacao_proxima: "Renovação próxima",
  aguardando_renovacao: "Aguardando renovação",
  pausado: "Pausado",
  alta_inativo: "Alta / inativo",
};

export function fluxoEstagioLabel(estagio: string): string {
  return FLUXO_ESTAGIO_LABEL[estagio as FluxoEstagio] ?? estagio;
}
