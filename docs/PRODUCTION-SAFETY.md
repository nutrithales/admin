# Produção segura — Nutri Admin

## Fronteira do sistema

`admin.nutrithales.com.br` é exclusivamente o painel administrativo do consultório.

Interfaces destinadas ao paciente devem permanecer no domínio público `www.nutrithales.com.br`, incluindo autenticação da Área do Paciente e dashboards de treino.

O Admin pode cadastrar, editar e liberar dados que serão consumidos pela Área do Paciente, mas não deve hospedar a experiência final do paciente.

## Regra de mudança

1. Criar branch a partir de `claude/nutri-admin-panel-wup8zh-akxeob`.
2. Fazer alterações pequenas e rastreáveis.
3. Abrir Pull Request para a branch de produção.
4. Aguardar typecheck, lint e build passarem.
5. Validar o Preview Deployment da Vercel para alterações visuais/funcionais.
6. Só então fazer merge.
7. Confirmar o smoke test de `admin.nutrithales.com.br` depois do deploy.

## Checkpoint estável

Checkpoint criado em 18/08/2026:

`checkpoint/2026-08-18-stable`

## Rollback

Se o Admin apresentar regressão em produção:

1. Preservar o estado atual para investigação.
2. Restaurar o último deployment `READY` comprovadamente estável na Vercel.
3. Não corrigir em sequência diretamente na branch de produção.
4. Reproduzir e corrigir o problema em branch separada.
5. Rodar typecheck, lint e build antes de nova publicação.

## Supabase

Mudanças de schema devem usar migrations. Revisar RLS, constraints, índices e impacto nos pacientes antes da execução. Operações destrutivas devem ter estratégia de backup/rollback definida antes de rodar.
