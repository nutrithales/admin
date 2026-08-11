/**
 * Matriz de permissões administrador vs. secretária/estagiária.
 *
 * Decisão clínica é sempre do nutricionista Thales: a secretária nunca
 * prescreve, altera plano alimentar, mexe em prontuário/avaliações,
 * exclui paciente definitivamente ou altera permissões do sistema.
 */
export type NivelAdmin = "admin" | "secretaria";

export type PermissaoAcao =
  | "pacientes.excluir"
  | "planos.editar"
  | "prontuario.editar"
  | "avaliacoes.editar"
  | "configuracoes.editar"
  | "administradores.editar"
  | "mensagens_modelos.editar";

/** Ações restritas a administrador. Tudo que não está aqui (agenda,
 * cadastro/atualização de paciente, Fluxo, pagamentos, check-ins, tarefas,
 * preparo de mensagens) é permitido também à secretária. */
const ACOES_SOMENTE_ADMIN: readonly PermissaoAcao[] = [
  "pacientes.excluir",
  "planos.editar",
  "prontuario.editar",
  "avaliacoes.editar",
  "configuracoes.editar",
  "administradores.editar",
  "mensagens_modelos.editar",
];

export function nivelPermite(nivel: NivelAdmin, acao: PermissaoAcao): boolean {
  if (nivel === "admin") return true;
  return !ACOES_SOMENTE_ADMIN.includes(acao);
}
