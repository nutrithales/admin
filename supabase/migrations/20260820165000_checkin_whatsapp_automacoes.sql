create table if not exists public.formulario_automacoes (
  id uuid primary key default gen_random_uuid(),
  formulario_id uuid not null references public.formularios(id) on delete cascade,
  nome text not null,
  publico text not null default 'ativos' check (publico in ('todos', 'ativos', 'selecionados')),
  paciente_ids uuid[] not null default '{}',
  recorrencia_dias integer not null default 15 check (recorrencia_dias > 0),
  primeira_execucao_em timestamptz not null,
  proximo_disparo_em timestamptz not null,
  ultimo_disparo_em timestamptz,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (publico <> 'selecionados' or cardinality(paciente_ids) > 0)
);

alter table public.formulario_automacoes enable row level security;

drop policy if exists "admins gerenciam automacoes de formularios" on public.formulario_automacoes;
create policy "admins gerenciam automacoes de formularios"
on public.formulario_automacoes
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

alter table public.formulario_envios
  add column if not exists automacao_id uuid references public.formulario_automacoes(id) on delete set null,
  add column if not exists ciclo_referencia timestamptz;

create unique index if not exists formulario_envios_automacao_ciclo_paciente_uidx
  on public.formulario_envios (automacao_id, ciclo_referencia, paciente_id)
  where automacao_id is not null and ciclo_referencia is not null;

create index if not exists formulario_envios_agendados_idx
  on public.formulario_envios (agendado_para)
  where status = 'agendado';

create index if not exists formulario_automacoes_proximo_disparo_idx
  on public.formulario_automacoes (proximo_disparo_em)
  where ativo = true;
