-- Nutri Thales Rosa — Painel Administrativo
--
-- This reflects the REAL schema of the project's Supabase database,
-- inspected directly (not guessed). Several tables predate this admin
-- panel and are shared with other patient-facing apps — `pacientes`,
-- `paginas_paciente`, `biblioteca`, `planos_alimentares`, `consultas`,
-- `checkins` and `historico_ia` already existed; this migration only
-- ADDS columns/tables/policies to them, it never renames or drops
-- anything. `diario` and `treino_sessions` also exist but are outside
-- this admin panel's scope and are left untouched.
--
-- Safe to run on a fresh project (creates everything from scratch) or
-- on the existing one (every statement is additive/idempotent).

create extension if not exists pgcrypto;

-- =========================================================================
-- administradores
-- =========================================================================
create table if not exists public.administradores (
  id uuid primary key default gen_random_uuid(),
  auth_id uuid not null references auth.users (id) on delete cascade,
  nome text,
  nivel text,
  foto_url text
);

alter table public.administradores add column if not exists foto_url text;

-- Security-definer helper so every other policy can cheaply ask
-- "is the current user an admin?" without exposing the table itself.
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.administradores where auth_id = auth.uid()
  );
$$;

revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated, service_role;

-- =========================================================================
-- pacientes
-- =========================================================================
create table if not exists public.pacientes (
  id uuid primary key default gen_random_uuid(),
  auth_id uuid not null references auth.users (id) on delete cascade,
  nome text,
  email text,
  telefone text,
  cpf text,
  plano text,
  data_inicio text,
  status text,
  created_at timestamp default now(),
  last_login_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.pacientes add column if not exists last_login_at timestamptz;
alter table public.pacientes add column if not exists updated_at timestamptz not null default now();

-- =========================================================================
-- paginas_paciente (links directly to auth.users via `user_id` — not
-- through `pacientes.id`. `tipo` is free text on purpose: new page types
-- can be added without a schema change.)
-- =========================================================================
create table if not exists public.paginas_paciente (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  titulo text not null,
  url_pagina text not null,
  tipo text not null default 'dashboard',
  icone text,
  ordem integer not null default 0,
  ativo boolean not null default true
);

alter table public.paginas_paciente add column if not exists tipo text not null default 'dashboard';
alter table public.paginas_paciente add column if not exists icone text;
alter table public.paginas_paciente add column if not exists ordem integer not null default 0;
alter table public.paginas_paciente add column if not exists ativo boolean not null default true;

-- =========================================================================
-- biblioteca (`categoria` is free text — there is no separate categories
-- table; the admin UI suggests previously-used values via a datalist)
-- =========================================================================
create table if not exists public.biblioteca (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  descricao text,
  categoria text,
  url text,
  ordem bigint default 0,
  ativo boolean default true,
  created_at timestamptz default now(),
  tipo text not null default 'link', -- pdf | video | link | html (extensible, no enum)
  bucket text,
  path text,
  thumbnail_path text
);

alter table public.biblioteca add column if not exists tipo text not null default 'link';
alter table public.biblioteca add column if not exists bucket text;
alter table public.biblioteca add column if not exists path text;
alter table public.biblioteca add column if not exists thumbnail_path text;

-- =========================================================================
-- planos_alimentares (links via `auth_id`, not `pacientes.id`)
-- =========================================================================
create table if not exists public.planos_alimentares (
  id uuid primary key default gen_random_uuid(),
  auth_id uuid not null references auth.users (id) on delete cascade,
  titulo text,
  bucket text,
  path text,
  data_envio timestamp,
  ativo boolean,
  tipo text not null default 'pdf', -- pdf | html (prepared for future)
  conteudo_html text
);

alter table public.planos_alimentares add column if not exists tipo text not null default 'pdf';
alter table public.planos_alimentares add column if not exists conteudo_html text;

-- =========================================================================
-- consultas (links via `auth_id`; structure prepared for a future Google
-- Calendar sync via `google_event_id`)
-- =========================================================================
create table if not exists public.consultas (
  id uuid primary key default gen_random_uuid(),
  auth_id uuid not null references auth.users (id) on delete cascade,
  data timestamp,
  tipo text,
  status text,
  observacoes text,
  google_event_id text
);

alter table public.consultas add column if not exists observacoes text;
alter table public.consultas add column if not exists google_event_id text;

-- =========================================================================
-- checkins (weekly summary + score; `origem` prepared for a future
-- LiveClin integration)
-- =========================================================================
create table if not exists public.checkins (
  id bigint generated by default as identity primary key,
  auth_id uuid not null references auth.users (id) on delete cascade,
  semana date,
  resumo text,
  pontuacao smallint,
  created_at timestamp default now(),
  origem text not null default 'manual' -- manual | liveclin
);

alter table public.checkins add column if not exists origem text not null default 'manual';

-- =========================================================================
-- historico_ia (Q&A history; the IA module itself is not implemented,
-- this admin panel only lists what's already recorded here)
-- =========================================================================
create table if not exists public.historico_ia (
  id uuid primary key default gen_random_uuid(),
  auth_id uuid not null references auth.users (id) on delete cascade,
  pergunta text,
  resposta text,
  created_at timestamp default now()
);

-- =========================================================================
-- configuracoes_consultorio (single row; genuinely new — no prior table
-- covered the "Configurações" module's clinic name/logo/address/etc.)
-- =========================================================================
create table if not exists public.configuracoes_consultorio (
  id boolean primary key default true,
  nome_consultorio text,
  logo_path text,
  endereco text,
  whatsapp text,
  email text,
  redes_sociais jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  constraint configuracoes_consultorio_singleton check (id)
);

insert into public.configuracoes_consultorio (id)
values (true)
on conflict (id) do nothing;

-- =========================================================================
-- Row Level Security
-- =========================================================================
alter table public.administradores enable row level security;
alter table public.pacientes enable row level security;
alter table public.paginas_paciente enable row level security;
alter table public.biblioteca enable row level security;
alter table public.planos_alimentares enable row level security;
alter table public.consultas enable row level security;
alter table public.checkins enable row level security;
alter table public.historico_ia enable row level security;
alter table public.configuracoes_consultorio enable row level security;

drop policy if exists "admins podem ler administradores" on public.administradores;
create policy "admins podem ler administradores"
  on public.administradores for select
  using (public.is_admin());

drop policy if exists "admins gerenciam pacientes" on public.pacientes;
create policy "admins gerenciam pacientes"
  on public.pacientes for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "paciente le proprio registro" on public.pacientes;
create policy "paciente le proprio registro"
  on public.pacientes for select
  using (auth.uid() = auth_id);

drop policy if exists "admins gerenciam paginas_paciente" on public.paginas_paciente;
create policy "admins gerenciam paginas_paciente"
  on public.paginas_paciente for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "usuario ve suas paginas" on public.paginas_paciente;
create policy "usuario ve suas paginas"
  on public.paginas_paciente for select
  using (auth.uid() = user_id and ativo = true);

drop policy if exists "admins gerenciam biblioteca" on public.biblioteca;
create policy "admins gerenciam biblioteca"
  on public.biblioteca for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "paciente le biblioteca ativa" on public.biblioteca;
create policy "paciente le biblioteca ativa"
  on public.biblioteca for select
  using (ativo = true and auth.role() = 'authenticated');

drop policy if exists "admins gerenciam planos_alimentares" on public.planos_alimentares;
create policy "admins gerenciam planos_alimentares"
  on public.planos_alimentares for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "paciente le proprios planos" on public.planos_alimentares;
create policy "paciente le proprios planos"
  on public.planos_alimentares for select
  using (auth.uid() = auth_id);

drop policy if exists "admins gerenciam consultas" on public.consultas;
create policy "admins gerenciam consultas"
  on public.consultas for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "paciente le proprias consultas" on public.consultas;
create policy "paciente le proprias consultas"
  on public.consultas for select
  using (auth.uid() = auth_id);

drop policy if exists "admins gerenciam checkins" on public.checkins;
create policy "admins gerenciam checkins"
  on public.checkins for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "paciente le proprios checkins" on public.checkins;
create policy "paciente le proprios checkins"
  on public.checkins for select
  using (auth.uid() = auth_id);

drop policy if exists "admins gerenciam historico_ia" on public.historico_ia;
create policy "admins gerenciam historico_ia"
  on public.historico_ia for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "paciente le proprio historico_ia" on public.historico_ia;
create policy "paciente le proprio historico_ia"
  on public.historico_ia for select
  using (auth.uid() = auth_id);

drop policy if exists "qualquer um le configuracoes" on public.configuracoes_consultorio;
create policy "qualquer um le configuracoes"
  on public.configuracoes_consultorio for select
  using (true);

drop policy if exists "admins escrevem configuracoes" on public.configuracoes_consultorio;
create policy "admins escrevem configuracoes"
  on public.configuracoes_consultorio for update
  using (public.is_admin())
  with check (public.is_admin());

-- =========================================================================
-- Storage buckets ('biblioteca' may already exist)
-- =========================================================================
insert into storage.buckets (id, name, public)
values ('planos', 'planos', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('biblioteca', 'biblioteca', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('config', 'config', true)
on conflict (id) do nothing;

drop policy if exists "admins gerenciam arquivos de planos" on storage.objects;
create policy "admins gerenciam arquivos de planos"
  on storage.objects for all
  using (bucket_id = 'planos' and public.is_admin())
  with check (bucket_id = 'planos' and public.is_admin());

drop policy if exists "paciente le proprio plano" on storage.objects;
create policy "paciente le proprio plano"
  on storage.objects for select
  using (
    bucket_id = 'planos'
    and exists (
      select 1 from public.planos_alimentares pl
      where pl.path = storage.objects.name and pl.auth_id = auth.uid()
    )
  );

drop policy if exists "admins gerenciam arquivos de biblioteca" on storage.objects;
create policy "admins gerenciam arquivos de biblioteca"
  on storage.objects for all
  using (bucket_id = 'biblioteca' and public.is_admin())
  with check (bucket_id = 'biblioteca' and public.is_admin());

drop policy if exists "paciente le arquivos de biblioteca ativos" on storage.objects;
create policy "paciente le arquivos de biblioteca ativos"
  on storage.objects for select
  using (
    bucket_id = 'biblioteca'
    and exists (select 1 from public.biblioteca b where b.path = storage.objects.name and b.ativo = true)
    and auth.role() = 'authenticated'
  );

drop policy if exists "admins gerenciam config publica" on storage.objects;
create policy "admins gerenciam config publica"
  on storage.objects for all
  using (bucket_id = 'config' and public.is_admin())
  with check (bucket_id = 'config' and public.is_admin());

drop policy if exists "qualquer um le arquivos de config" on storage.objects;
create policy "qualquer um le arquivos de config"
  on storage.objects for select
  using (bucket_id = 'config');
