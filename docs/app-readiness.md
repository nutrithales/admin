# App Readiness — Nutri Thales

## Objetivo

Preparar o ecossistema atual para evoluir da Área do Paciente web para PWA e, posteriormente, aplicativo iOS/Android, preservando o que já funciona no painel administrativo.

## Princípios

- Não duplicar banco de dados.
- Supabase continua como fonte única de verdade.
- Não expor service role ao cliente.
- Regras de autorização devem estar protegidas por RLS e validações server-side.
- Evitar lógica de negócio acoplada a páginas Next.js quando ela puder ser compartilhada por web e app.
- Toda mudança estrutural deve ser feita por migration versionada.
- Priorizar UX mobile e prevenção de regressões.

## Estado atual identificado

### Frontend

- Next.js App Router + TypeScript.
- Área do paciente separada em `/paciente`.
- Rotas atuais identificadas:
  - `/paciente`
  - `/paciente/login`
  - `/paciente/plano-alimentar`
  - `/paciente/pre-consulta`
  - `/paciente/treinos`
- A Home da Área do Paciente já consulta o usuário autenticado e associa pelo campo `pacientes.auth_id`.

### Arquitetura existente aproveitável

- `src/lib/supabase`: clientes browser/server/admin e middleware.
- `src/services`: camada de serviços/queries já iniciada.
- `src/types`: tipos compartilháveis.
- `supabase/migrations`: migrations versionadas existentes.
- Supabase Auth já é utilizado para paciente e administrador.

### Banco de dados

O banco já contém estruturas relevantes para o futuro app, incluindo:

- `pacientes`
- `paginas_paciente`
- `biblioteca`
- `planos_alimentares`
- `planos_estruturados`
- `checkins`
- `consultas`
- `avaliacoes_fisicas`
- `formularios_pre_consulta`
- `treino_programas`
- `treino_exercicios`
- `treino_execucoes`
- `treino_execucao_series`
- `treino_progresso`

As tabelas principais auditadas estão com RLS habilitado.

## Achados iniciais

### 1. Branch principal do repositório

O repositório está atualmente configurado com `claude/nutri-admin-panel-wup8zh-akxeob` como default branch. Antes de reorganizar branches, confirmar qual branch está conectada à produção na Vercel.

### 2. Redirecionamento do login do paciente

O middleware atualmente redireciona um paciente autenticado que acessa `/paciente/login` para `/paciente/pre-consulta`. Para a nova experiência, o destino esperado deverá ser a Home `/paciente`, salvo quando existir um fluxo explícito de onboarding/pré-consulta pendente.

### 3. Segurança do Supabase

O Security Advisor identificou pontos que exigem revisão antes do app nativo:

- funções `SECURITY DEFINER` executáveis por `anon`;
- funções `SECURITY DEFINER` executáveis por `authenticated`;
- funções com `search_path` mutável;
- tabela `matriz_orientacoes_premium` com RLS habilitado sem policy;
- proteção contra senhas vazadas desabilitada no Auth.

Esses itens devem ser classificados por uso real antes de revogar permissões, para não quebrar funcionalidades existentes.

## Arquitetura alvo

```text
                    Supabase
                       │
          ┌────────────┴────────────┐
          │                         │
   regras compartilhadas      autenticação/RLS
          │                         │
    ┌─────┴─────┐            ┌──────┴──────┐
    │           │            │             │
Admin Web   Paciente Web    PWA        App Expo
Next.js       Next.js                  React Native
```

## Plano de execução

### Fase 1 — Auditoria e estabilização

- [x] Identificar repositório central.
- [x] Mapear Área do Paciente.
- [x] Mapear camada Supabase.
- [x] Revisar estrutura geral do schema.
- [x] Rodar Security Advisor.
- [ ] Confirmar branch efetivamente usada pela Vercel.
- [ ] Mapear policies RLS das tabelas consumidas pelo paciente.
- [ ] Mapear uso das funções `SECURITY DEFINER` antes de alterar grants.
- [ ] Revisar Storage/buckets e políticas de arquivos.
- [ ] Validar tipos TypeScript contra o schema atual.

### Fase 2 — Área do Paciente mobile-first

- [ ] Tornar `/paciente` a Home principal após login.
- [ ] Criar navegação mobile consistente.
- [ ] Adicionar estados de loading/error/empty consistentes.
- [ ] Implementar Materiais.
- [ ] Integrar Check-in.
- [ ] Integrar Consultas/Agendamento.
- [ ] Integrar Evolução/Avaliações disponibilizadas.
- [ ] Criar Perfil do paciente.

### Fase 3 — Separação de domínio

- [ ] Centralizar busca do paciente autenticado em service compartilhado.
- [ ] Centralizar consultas de plano alimentar.
- [ ] Centralizar consultas de treino.
- [ ] Centralizar consultas de check-in.
- [ ] Centralizar consultas de avaliações/evolução.
- [ ] Remover `any` das consultas críticas ao Supabase.
- [ ] Regenerar e versionar `database.types.ts` quando necessário.

### Fase 4 — PWA

- [ ] Manifest.
- [ ] Ícones.
- [ ] Metadata mobile.
- [ ] Instalação em tela inicial.
- [ ] Testes iOS Safari.
- [ ] Testes Android Chrome.
- [ ] Estratégia de cache segura (sem cache indevido de dados clínicos).

### Fase 5 — App nativo

- [ ] Criar app Expo/React Native em projeto separado ou monorepo após estabilização.
- [ ] Reutilizar Supabase Auth e o mesmo banco.
- [ ] Reutilizar contratos/types e regras compartilháveis.
- [ ] Implementar push notifications.
- [ ] Implementar biometria/secure storage quando necessário.
- [ ] Publicação TestFlight/Play Internal Testing antes de produção.

## Regra de segurança para próximas alterações

Nenhuma policy RLS, grant, função `SECURITY DEFINER`, migration destrutiva ou alteração de autenticação será modificada apenas para silenciar o linter. Primeiro deve ser identificado quem usa a função/policy, qual rota depende dela e qual impacto ocorrerá em produção.
