# Clara — Secretária Virtual

Assistente operacional do painel administrativo do consultório (Thales Rosa,
nutricionista — Curitiba/PR). A Clara ajuda com agenda, cadastro, planos,
check-ins, Fluxo de pacientes, pendências e mensagens administrativas.

**A Clara não é nutricionista.** Ela nunca prescreve, interpreta exame,
sugere conduta clínica ou decide nada sobre o plano alimentar de um
paciente — toda decisão clínica é sempre do Thales. Ela também nunca envia
WhatsApp, e-mail ou qualquer mensagem externa sozinha: toda mensagem é
preparada para revisão humana e cópia manual. Ações destrutivas (excluir
paciente, por exemplo) exigem confirmação explícita na tela e são
restritas ao nível "admin" — nunca à secretária.

> **Nota histórica:** o módulo Fluxo (`/fluxo`, `src/lib/fluxo/stages.ts`,
> `src/services/fluxo.*`) e o formulário de pré-consulta
> (`formularios_pre_consulta`, `/paciente/pre-consulta`) foram construídos
> em paralelo, por outro caminho (fora desta sessão), enquanto a Clara
> estava sendo desenvolvida no mesmo repositório em outro branch — por
> isso o PR da Clara teve conflito de merge real com esse trabalho. A
> lição: antes de escrever uma migration nova ou desenhar uma feature que
> toca uma área "cinzenta" do produto, vale rodar
> `list_tables`/`list_migrations` contra o projeto real (MCP do Supabase)
> e checar o branch-base atualizado — os arquivos locais podem estar
> desatualizados em relação ao que já existe.

## Onde fica

- Página principal: `/clara` (fora do grupo de rotas `(admin)`, que já
  mapeia para a raiz do domínio — não existe prefixo `/admin` em nenhuma
  rota deste painel, então a Clara segue o mesmo padrão).
- Fluxo de pacientes: `/fluxo`.
- Modelos de mensagem: aba "Modelos de mensagem (Clara)" em `/configuracoes`.
- Aba "Administrativo (Clara)" dentro do perfil de cada paciente
  (`/pacientes/[id]`) — pendências, pagamentos, etapa atual do Fluxo e
  observações daquele paciente, sempre separado do prontuário clínico.

## Arquitetura

- `src/lib/clara/*` — regras puras, sem I/O: cálculo de consultas
  realizadas/restantes (`consultas.ts`), situação de check-in
  (`checkins.ts`), motor de detecção de pendências (`pendencias-engine.ts`,
  que lê as etapas do Fluxo de `src/lib/fluxo/stages.ts`), interpretação
  de comandos por palavra-chave (`comandos.ts`), preenchimento de
  mensagens (`mensagens.ts`) e a matriz de permissões (`permissoes.ts`).
  São funções puras de propósito — dá para testar sem banco.
- `src/services/*.queries.ts` / `*.actions.ts` — ligam essas regras ao
  Supabase, seguindo exatamente o padrão que já existia no projeto para os
  outros módulos (pacientes, consultas, planos, etc.).
- `src/lib/supabase/assert-permission.ts` — como `assert-admin.ts`, mas
  também devolve o nível do administrador e bloqueia ações restritas.

### Comandos sem depender de IA paga

`interpretarComando` (`src/lib/clara/comandos.ts`) casa o texto digitado
contra grupos de palavras-chave (sem acento, minúsculo) e devolve uma
intenção estruturada. Todos os comandos essenciais listados no requisito
original funcionam sem nenhuma chave de API. A arquitetura está pronta
para, no futuro, um fallback opcional de IA tentar interpretar comandos
que não batam com nenhuma regra — mas isso é aditivo, nunca uma
dependência obrigatória.

## Regras de planos e consultas

Definidas em `src/lib/agenda/plans.ts` (já existia antes da Clara, reutilizado):

| Plano | Consultas incluídas |
|---|---|
| Consulta Avulsa | 1 |
| Plano Essencial | 3 |
| Plano Evolução | 6 |
| Plano Elite Premium | 9 |

`pacientes.consultas_incluidas` e `pacientes.consultas_realizadas_iniciais`
são editáveis pelo administrador (tela "Alterar plano" em `/pacientes`) —
usados para corrigir histórico anterior ao sistema.

**Consultas realizadas nunca são um contador armazenado** —
`computeConsultasStats` (`src/lib/clara/consultas.ts`) sempre recalcula a
partir de `consultas_realizadas_iniciais + consultas com status
"realizada"`. Isso elimina o risco de contagem duplicada por construção:
não existe um número para "esquecer de atualizar". Mudar o status de uma
consulta (concluir, cancelar, reabrir, excluir) automaticamente muda o
resultado desse cálculo na próxima leitura.

### Vocabulário único de status de consulta

Antes da Clara, o projeto tinha dois vocabulários de status coexistindo:
o CRUD manual usava `agendada | concluida | cancelada`, enquanto a
sincronização com a agenda pública e todo o cálculo de "consultas
realizadas" usavam `agendada | realizada | falta | cancelada`. Ou seja,
concluir uma consulta cadastrada manualmente nunca somava ao plano do
paciente. A migration `20260811210000_clara_secretaria_virtual.sql`
migrou os dados existentes e unificou tudo em:

`agendada | confirmada | realizada | cancelada | nao_compareceu | reagendada`

(`src/lib/clara/consultas.ts` → `CONSULTA_STATUS`).

## Fluxo de pacientes

O Fluxo (`/fluxo`) **não é um módulo da Clara** — é a implementação
já existente do funil de pacientes, com quadro kanban + tabela, busca,
filtro por grupo, arrastar-e-soltar, e um painel de detalhe por paciente
(urgente/observações/próxima ação/WhatsApp/link do perfil). Vive em
`src/lib/fluxo/stages.ts` (`FLOW_STAGES`, `FLOW_GROUPS`, `getFlowStage`)
e `src/services/fluxo.queries.ts`/`fluxo.actions.ts`
(`listFluxoPacientes`, `updateFluxoPacienteAction`). A Clara **consome**
esse sistema, não o substitui.

`pacientes.fluxo_etapa` **não é texto livre**: tem uma CHECK constraint
fixa no banco com 24 etapas específicas (funil numerado — `01_lead_recebido`
→ `16_renovado`, mais alguns estados utilitários como `nada_agora`,
`mandar_mensagem`, `pausa_acompanhamento`), agrupadas em captação /
atendimento / acompanhamento / renovação / outros. Se a constraint mudar
em banco, atualize `FLOW_STAGES` junto.

Colunas do Fluxo, todas em `pacientes`: `fluxo_etapa`, `fluxo_urgente`,
`fluxo_observacoes` (a Clara reaproveita esse campo na aba
"Administrativo" do perfil do paciente — não criou um campo de
observações administrativas separado, para não duplicar),
`fluxo_proxima_acao_em`, `fluxo_updated_at`. O webhook de agendamento
(`src/app/api/agenda/webhook/route.ts`) e o `PATCH` da agenda
(`src/app/api/agenda/route.ts`) já avançam `fluxo_etapa` automaticamente
(novo lead → `04_agendado`; consulta concluída → `06_consulta_realizada`).

O que a Clara **adicionou** por cima (aditivo — nenhuma coluna existente
foi tocada): a tabela `fluxo_movimentacoes`, que não existia — histórico
de toda mudança de etapa (`de_etapa`/`para_etapa`/`observacao`/`admin_id`).
`updateFluxoPacienteAction` foi estendida para gravar esse histórico e
recalcular a central de pendências a cada chamada, além de continuar
fazendo o que já fazia. `getHistoricoFluxoAction`/`listHistoricoFluxo`
alimentam o histórico curto mostrado na aba "Administrativo" do perfil.

A central de pendências usa os campos reais do Fluxo: `fluxo_urgente =
true` vira pendência de prioridade alta; `fluxo_proxima_acao_em` vencida
vira pendência "Ação do Fluxo atrasada"; só cai no fallback de "sem
movimentação" (baseado no histórico da Clara) quando não há
`fluxo_proxima_acao_em` definida.

## Central de pendências

`detectarPendencias` (`src/lib/clara/pendencias-engine.ts`) é o motor
puro: recebe pacientes/consultas/checkins/pagamentos/tarefas já
carregados e devolve candidatos. `syncPendencias`
(`src/services/pendencias.actions.ts`) roda esse motor contra o estado
real do banco a cada carregamento da página `/clara` e depois de ações
relevantes (mudar status de consulta, registrar pagamento, mover no
Fluxo, etc.):

- resolve automaticamente pendências cuja condição não existe mais;
- reabre pendências adiadas cujo prazo já passou;
- cria as novas que ainda não existem.

Nunca decide nada clínico — só espelha situações administrativas.

## Check-ins

Periodicidade: quinzenal (`CHECKIN_PERIODICIDADE_DIAS` em
`src/lib/clara/checkins.ts`). Um check-in "enviado" sem resposta depois de
`CHECKIN_PRAZO_RESPOSTA_DIAS` (5 dias) vira pendência de prioridade alta.
A Clara organiza e resume — a leitura clínica da resposta é sempre do
nutricionista.

## Mensagens

Modelos ficam em `mensagens_modelos` (editáveis em Configurações, nível
admin). Placeholders: `{{primeiro_nome}}`, `{{data}}`, `{{horario}}`,
`{{tipo_consulta}}`, `{{local_ou_link}}`, `{{plano}}`,
`{{consultas_realizadas}}`, `{{consultas_restantes}}`. `fillTemplate`
(`src/lib/clara/mensagens.ts`) preenche com dados reais do paciente/
consulta. **Nenhuma mensagem é enviada automaticamente** — a Clara sempre
prepara o texto para revisão e cópia manual (WhatsApp, e-mail, etc. ficam
por conta do Thales/secretária).

## Permissões

`src/lib/clara/permissoes.ts` define a matriz; `assertPermission()`
(`src/lib/supabase/assert-permission.ts`) valida no servidor — a UI só
evita mostrar a ação, a validação real é sempre no backend.
`administradores.nivel` (coluna já existente, antes ociosa) vale
`"admin" | "secretaria"`; `null` é tratado como admin, para manter
compatibilidade com os administradores já cadastrados.

Restrito a **admin**: excluir paciente definitivamente (reforçado também
em RLS, como defesa em profundidade), editar plano alimentar estruturado,
editar prontuário, editar avaliações físicas, editar configurações do
consultório, editar modelos de mensagem.

Liberado para **secretária/estagiária**: cadastrar/atualizar dados
administrativos de paciente, agenda, Fluxo, pagamentos, check-ins,
tarefas, preparar mensagens (usar os modelos, não editá-los).

> Módulo ainda **não** coberto por essa gate: o builder de planos
> alimentares estruturados (`src/services/planos-estruturados.actions.ts`,
> `src/services/planos.actions.ts`) continua exigindo só `assertAdmin()`
> (qualquer administrador, sem diferenciar nível). Ele tem ~18 Server
> Actions e é uma funcionalidade complexa em uso ativo — decidi não
> reescrevê-lo às pressas numa mesma sessão para não arriscar quebrar o
> construtor de planos. Recomendo uma passada dedicada a isso depois,
> trocando `assertAdmin` por
> `assertPermission("planos.editar")` nesses dois arquivos.

## Segurança e LGPD

- RLS em todas as tabelas novas (`is_admin()`, mesmo padrão de
  `0001_init.sql`) — nada disso é exposto à área do paciente.
- `SUPABASE_SERVICE_ROLE_KEY` nunca é usada por essas rotas — tudo passa
  pelo cliente autenticado (`createClient()`), sujeito a RLS.
- Nenhuma tabela nova grava dado clínico. Prontuário e avaliações
  continuam isolados como já estavam.
- `logs_auditoria` existe para registrar ações administrativas
  importantes no futuro (a infraestrutura está pronta; nenhuma ação ainda
  grava nela automaticamente — próximo passo natural, não crítico para o
  funcionamento da Clara).

## O que falta (próximos passos sugeridos)

1. Gate de permissão no builder de planos alimentares (`planos.editar`).
2. Tela de gestão de administradores (criar secretária com `nivel =
   'secretaria'` hoje precisa ser feito direto no Supabase).
3. Testes automatizados — o projeto não tinha framework de testes antes
   da Clara; por ora a lógica sensível (`src/lib/clara/*`) foi escrita
   como funções puras justamente para ficar fácil de testar quando um
   framework (Vitest, por exemplo) for adicionado.
4. Popular `logs_auditoria` nas ações mais sensíveis.
5. Integração real de IA (a arquitetura de comandos já está pronta para
   um fallback opcional).
