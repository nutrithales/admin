# Painel Administrativo — Nutri Thales Rosa

Next.js (App Router) + TypeScript + Tailwind CSS + Supabase.

## Configuração

1. **Variáveis de ambiente** — copie `.env.local.example` para `.env.local` e
   preencha com os dados do seu projeto Supabase (Project Settings → API).
   A `SUPABASE_SERVICE_ROLE_KEY` é secreta: nunca a exponha no cliente nem a
   commite.

2. **Banco de dados** — aplique `supabase/migrations/0001_init.sql` no seu
   projeto (SQL Editor do Supabase, ou `supabase db push` com a CLI). Ele
   cria as tabelas em `create table if not exists`, então é seguro rodar
   mesmo que algumas já existam — revise a lista de colunas nesse caso.

3. **Primeiro administrador** — como o login só funciona para usuários
   presentes na tabela `administradores`, crie o primeiro manualmente:
   - Crie o usuário em Authentication → Users (convide por e-mail ou defina
     uma senha diretamente).
   - Insira uma linha em `administradores` com o `auth_id` desse usuário.

4. **Senhas de pacientes** — ao cadastrar um paciente ou usar "Resetar
   senha", o painel gera uma senha temporária, envia por e-mail ao paciente
   via Resend (`RESEND_API_KEY` / `EMAIL_FROM`) e também a exibe uma única
   vez para o administrador copiar. Sem o Resend configurado, o envio falha
   silenciosamente e a senha só fica disponível na tela — não depende de
   SMTP do Supabase.

5. **Instalar e rodar**:
   ```bash
   npm install
   npm run dev
   ```

## Estrutura

- `src/app/(admin)` — páginas protegidas do painel (uma pasta por módulo).
- `src/app/login` — login exclusivo de administradores.
- `src/components/ui` — biblioteca de componentes (Button, Card, Modal,
  DataTable, etc.) que segue a identidade visual do site institucional.
- `src/components/layout` — Sidebar, Topbar e o shell do painel.
- `src/services/*.queries.ts` — leituras (Server Components).
- `src/services/*.actions.ts` — Server Actions (mutações).
- `src/lib/supabase` — clientes Supabase (browser, server, admin/service-role,
  middleware).
- `src/lib/email` — envio de e-mail transacional via Resend (credenciais de
  acesso do paciente).
- `supabase/migrations` — schema SQL, RLS e buckets de Storage.

## Notas de arquitetura

- `paginas_paciente.tipo` e `biblioteca.tipo` são texto livre — novos tipos
  de página/conteúdo não exigem alteração de schema.
- `consultas.google_event_id` e `checkins.origem` já existem para as
  futuras integrações com Google Calendar e LiveClin, mas nenhuma das duas
  está implementada ainda.
- O módulo **IA** é só a estrutura de página, sem funcionalidade.
