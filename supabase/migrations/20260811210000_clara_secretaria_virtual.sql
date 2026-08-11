-- Clara — Secretária Virtual
--
-- Só ADITIVO: nenhuma tabela/coluna existente é removida ou renomeada, e os
-- dados atuais são preservados. Cobre:
--   1) unificação do vocabulário de status de `consultas` (hoje havia dois
--      vocabulários incompatíveis convivendo no projeto — ver nota abaixo);
--   2) rastreio de envio/resposta de check-in;
--   3) histórico de movimentações para o Fluxo de pacientes já existente
--      (`pacientes.fluxo_etapa` e colunas relacionadas não são tocadas —
--      só ganham uma tabela de histórico nova);
--   4) tarefas, pendências, pagamentos, modelos de mensagem e log de
--      auditoria administrativos — nenhum dado clínico;
--   5) uso da coluna `administradores.nivel`, já existente e ociosa, para
--      diferenciar administrador de secretária/estagiária.
--
-- Nota sobre o status de `consultas`: o CRUD manual (ConsultasClient) só
-- aceitava 'agendada' | 'concluida' | 'cancelada', enquanto a sincronização
-- com a agenda pública (/api/agenda) e todo o cálculo de "consultas
-- realizadas" usam 'agendada' | 'realizada' | 'falta' | 'cancelada'. Ou
-- seja: concluir uma consulta cadastrada manualmente nunca somava ao plano
-- do paciente. Esta migração migra os dados para um vocabulário único.

-- =========================================================================
-- 1) consultas — vocabulário único de status
-- =========================================================================
update public.consultas set status = 'realizada' where status = 'concluida';
update public.consultas set status = 'nao_compareceu' where status = 'falta';

alter table public.consultas
  drop constraint if exists consultas_status_check,
  add constraint consultas_status_check check (
    status is null or status in (
      'agendada', 'confirmada', 'realizada', 'cancelada', 'nao_compareceu', 'reagendada'
    )
  );

alter table public.consultas add column if not exists confirmada_em timestamptz;

-- =========================================================================
-- 2) checkins — rastreio de envio/resposta (quinzenal)
-- =========================================================================
alter table public.checkins add column if not exists status text not null default 'respondido';
alter table public.checkins add column if not exists enviado_em timestamptz;
alter table public.checkins add column if not exists respondido_em timestamptz;
alter table public.checkins add column if not exists revisado boolean not null default false;

-- Backfill: check-ins que já existiam representam respostas já registradas
-- manualmente, então tratamos como respondidas e já revisadas.
update public.checkins
set respondido_em = coalesce(respondido_em, created_at),
    revisado = true
where status = 'respondido' and respondido_em is null;

alter table public.checkins
  drop constraint if exists checkins_status_check,
  add constraint checkins_status_check check (status in ('pendente', 'enviado', 'respondido'));

-- =========================================================================
-- 3) Fluxo de pacientes — histórico de movimentações
--
-- IMPORTANTE: o Fluxo em si (`pacientes.fluxo_etapa`, `fluxo_urgente`,
-- `fluxo_observacoes`, `fluxo_proxima_acao_em`, `fluxo_updated_at`) **já
-- existe** neste banco — foi aplicado por fora deste repositório antes da
-- Clara, com uma CHECK constraint fixa enumerando as etapas do funil. A
-- Clara não recria nada disso; ela só ADICIONA uma tabela de histórico de
-- movimentações, que ainda não existia, reaproveitando o `fluxo_etapa`
-- real (ver `src/lib/clara/fluxo.ts` para a lista de etapas espelhada a
-- partir da constraint do banco).
-- =========================================================================
create table if not exists public.fluxo_movimentacoes (
  id uuid primary key default gen_random_uuid(),
  paciente_id uuid not null references public.pacientes (id) on delete cascade,
  de_etapa text,
  para_etapa text not null,
  observacao text,
  admin_id uuid references public.administradores (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists fluxo_movimentacoes_paciente_idx on public.fluxo_movimentacoes (paciente_id, created_at desc);

-- Semeia um registro inicial por paciente com a etapa atual, para o
-- histórico já começar coerente com o estado real do Fluxo.
insert into public.fluxo_movimentacoes (paciente_id, de_etapa, para_etapa, observacao)
select id, null, fluxo_etapa, 'Etapa inicial registrada automaticamente pela migração da Clara'
from public.pacientes
where not exists (select 1 from public.fluxo_movimentacoes where paciente_id = pacientes.id);

-- =========================================================================
-- 4) tarefas
-- =========================================================================
create table if not exists public.tarefas (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  descricao text,
  paciente_id uuid references public.pacientes (id) on delete set null,
  responsavel_id uuid references public.administradores (id) on delete set null,
  criado_por uuid references public.administradores (id) on delete set null,
  prioridade text not null default 'media' check (prioridade in ('baixa', 'media', 'alta')),
  status text not null default 'pendente' check (status in ('pendente', 'concluida', 'cancelada')),
  prazo date,
  concluida_em timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tarefas_status_prazo_idx on public.tarefas (status, prazo);
create index if not exists tarefas_paciente_idx on public.tarefas (paciente_id);

-- =========================================================================
-- 5) pendencias — central de pendências da Clara
-- =========================================================================
create table if not exists public.pendencias (
  id uuid primary key default gen_random_uuid(),
  tipo text not null,
  paciente_id uuid references public.pacientes (id) on delete cascade,
  consulta_id uuid references public.consultas (id) on delete set null,
  tarefa_id uuid references public.tarefas (id) on delete cascade,
  motivo text not null,
  prioridade text not null default 'media' check (prioridade in ('baixa', 'media', 'alta')),
  status text not null default 'pendente' check (status in ('pendente', 'adiada', 'resolvida')),
  prazo date,
  adiada_ate date,
  responsavel_id uuid references public.administradores (id) on delete set null,
  resolvida_em timestamptz,
  resolvida_por uuid references public.administradores (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Evita pendências automáticas duplicadas enquanto a anterior segue ativa
-- (pendente ou adiada). Dois índices parciais porque uma pendência é
-- "identificada" por paciente OU por tarefa, nunca pelas duas colunas ao
-- mesmo tempo (NULL não é considerado igual a NULL em índice único
-- composto, então uma única constraint (tipo, paciente_id, tarefa_id) não
-- deduplicaria nada quando uma das colunas fosse sempre nula).
create unique index if not exists pendencias_ativa_paciente_idx
  on public.pendencias (tipo, paciente_id)
  where status <> 'resolvida' and paciente_id is not null and tarefa_id is null;

create unique index if not exists pendencias_ativa_tarefa_idx
  on public.pendencias (tipo, tarefa_id)
  where status <> 'resolvida' and tarefa_id is not null;

create index if not exists pendencias_status_idx on public.pendencias (status, prioridade);

-- =========================================================================
-- 6) pagamentos
-- =========================================================================
create table if not exists public.pagamentos (
  id uuid primary key default gen_random_uuid(),
  paciente_id uuid not null references public.pacientes (id) on delete cascade,
  plano text,
  valor numeric,
  status text not null default 'pendente' check (status in ('pendente', 'pago', 'atrasado', 'cancelado')),
  forma_pagamento text,
  vencimento date,
  pago_em timestamptz,
  observacoes text,
  criado_por uuid references public.administradores (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists pagamentos_paciente_idx on public.pagamentos (paciente_id);
create index if not exists pagamentos_status_idx on public.pagamentos (status, vencimento);

-- =========================================================================
-- 7) mensagens_modelos — textos administrativos editáveis (nunca enviados
-- automaticamente; a Clara só preenche e prepara para revisão/cópia).
-- =========================================================================
create table if not exists public.mensagens_modelos (
  id uuid primary key default gen_random_uuid(),
  chave text not null unique,
  titulo text not null,
  corpo text not null,
  ativo boolean not null default true,
  updated_at timestamptz not null default now()
);

insert into public.mensagens_modelos (chave, titulo, corpo) values
  ('confirmacao_consulta', 'Confirmação de consulta',
   'Olá, {{primeiro_nome}}! Passando para confirmar sua consulta ({{tipo_consulta}}) no dia {{data}} às {{horario}}, em {{local_ou_link}}. Pode confirmar presença?'),
  ('lembrete_consulta', 'Lembrete de consulta',
   'Oi, {{primeiro_nome}}! Lembrete da sua consulta amanhã, {{data}} às {{horario}}, em {{local_ou_link}}. Até lá!'),
  ('reagendamento', 'Reagendamento',
   'Olá, {{primeiro_nome}}! Precisamos reagendar sua consulta. Pode me dizer qual dia e horário funcionam melhor para você?'),
  ('ausencia', 'Ausência em consulta',
   'Oi, {{primeiro_nome}}! Notei que não conseguimos nos falar no horário da sua consulta em {{data}} às {{horario}}. Vamos remarcar?'),
  ('envio_checkin', 'Envio de check-in',
   'Olá, {{primeiro_nome}}! Chegou a hora do seu check-in quinzenal. Pode me contar como estão indo a alimentação, o treino e o sono nesses últimos 15 dias?'),
  ('lembrete_checkin', 'Lembrete de check-in',
   'Oi, {{primeiro_nome}}! Ainda não recebemos seu check-in dessa quinzena. Consegue me mandar um resumo rápido de como você está?'),
  ('renovacao_plano', 'Renovação de plano',
   'Olá, {{primeiro_nome}}! Você está em {{consultas_realizadas}} de {{consultas_restantes}} consultas restantes do seu {{plano}}. Vamos combinar a renovação do seu acompanhamento?'),
  ('reativacao_paciente', 'Reativação de paciente',
   'Oi, {{primeiro_nome}}! Faz um tempo que não nos falamos. Que tal retomarmos seu acompanhamento nutricional?'),
  ('novo_link_agendamento', 'Novo link de agendamento',
   'Olá, {{primeiro_nome}}! Segue o link para agendar sua consulta: {{local_ou_link}}'),
  ('cobranca_pagamento', 'Cobrança / lembrete de pagamento',
   'Oi, {{primeiro_nome}}! Passando para lembrar do pagamento referente ao seu {{plano}}. Qualquer dúvida, me avise.')
on conflict (chave) do nothing;

-- =========================================================================
-- 8) logs_auditoria
-- =========================================================================
create table if not exists public.logs_auditoria (
  id bigint generated by default as identity primary key,
  admin_id uuid references public.administradores (id) on delete set null,
  acao text not null,
  entidade text,
  entidade_id text,
  detalhes jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists logs_auditoria_created_idx on public.logs_auditoria (created_at desc);

-- =========================================================================
-- 9) administradores.nivel — admin | secretaria (null = admin, por
-- compatibilidade com os administradores já cadastrados)
-- =========================================================================
alter table public.administradores
  drop constraint if exists administradores_nivel_check,
  add constraint administradores_nivel_check check (nivel is null or nivel in ('admin', 'secretaria'));

create or replace function public.is_full_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.administradores
    where auth_id = auth.uid() and (nivel is null or nivel = 'admin')
  );
$$;

revoke execute on function public.is_full_admin() from public, anon;
grant execute on function public.is_full_admin() to authenticated, service_role;

-- =========================================================================
-- Row Level Security — tudo restrito a administradores autenticados,
-- seguindo exatamente o padrão de 0001_init.sql. Nenhuma dessas tabelas é
-- exposta à área do paciente.
-- =========================================================================
alter table public.fluxo_movimentacoes enable row level security;
alter table public.tarefas enable row level security;
alter table public.pendencias enable row level security;
alter table public.pagamentos enable row level security;
alter table public.mensagens_modelos enable row level security;
alter table public.logs_auditoria enable row level security;

drop policy if exists "admins gerenciam fluxo_movimentacoes" on public.fluxo_movimentacoes;
create policy "admins gerenciam fluxo_movimentacoes"
  on public.fluxo_movimentacoes for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "admins gerenciam tarefas" on public.tarefas;
create policy "admins gerenciam tarefas"
  on public.tarefas for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "admins gerenciam pendencias" on public.pendencias;
create policy "admins gerenciam pendencias"
  on public.pendencias for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "admins gerenciam pagamentos" on public.pagamentos;
create policy "admins gerenciam pagamentos"
  on public.pagamentos for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "admins gerenciam mensagens_modelos" on public.mensagens_modelos;
create policy "admins gerenciam mensagens_modelos"
  on public.mensagens_modelos for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "admins gerenciam logs_auditoria" on public.logs_auditoria;
create policy "admins gerenciam logs_auditoria"
  on public.logs_auditoria for all
  using (public.is_admin())
  with check (public.is_admin());

-- Reforço em banco (defesa em profundidade — a checagem principal é no
-- servidor, via assertPermission): excluir paciente definitivamente exige
-- nível "admin" (não "secretaria"). Mantém select/insert/update abertos a
-- qualquer administrador, como já era.
drop policy if exists "admins gerenciam pacientes" on public.pacientes;
create policy "admins leem e atualizam pacientes"
  on public.pacientes for select
  using (public.is_admin());
drop policy if exists "admins inserem pacientes" on public.pacientes;
create policy "admins inserem pacientes"
  on public.pacientes for insert
  with check (public.is_admin());
drop policy if exists "admins atualizam pacientes" on public.pacientes;
create policy "admins atualizam pacientes"
  on public.pacientes for update
  using (public.is_admin())
  with check (public.is_admin());
drop policy if exists "admins com nivel total excluem pacientes" on public.pacientes;
create policy "admins com nivel total excluem pacientes"
  on public.pacientes for delete
  using (public.is_full_admin());
