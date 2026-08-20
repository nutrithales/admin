-- Serviços de treino podem coexistir com o acompanhamento nutricional
-- armazenado nos campos legados de pacientes.
create table if not exists public.paciente_planos (
  id uuid primary key default gen_random_uuid(),
  paciente_id uuid not null references public.pacientes(id) on delete cascade,
  categoria text not null check (categoria in ('treino')),
  nome text not null check (nome in ('Consultoria de treino', 'Personal Trainer')),
  data_inicio date not null,
  data_fim date not null,
  status text not null default 'ativo' check (status in ('ativo', 'encerrado', 'cancelado')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint paciente_planos_periodo_valido check (data_fim >= data_inicio)
);

create index if not exists paciente_planos_paciente_status_idx
  on public.paciente_planos (paciente_id, status, data_fim desc);

alter table public.paciente_planos enable row level security;

revoke all on table public.paciente_planos from anon;
grant select, insert, update, delete on table public.paciente_planos to authenticated;
grant all on table public.paciente_planos to service_role;

drop policy if exists "admins gerenciam planos paralelos" on public.paciente_planos;
create policy "admins gerenciam planos paralelos"
  on public.paciente_planos for all
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));
