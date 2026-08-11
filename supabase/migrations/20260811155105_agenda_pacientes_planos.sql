-- Integra os agendamentos públicos aos perfis de pacientes e controla
-- o consumo dos planos sem perder consultas realizadas antes do sistema.

alter table public.pacientes
  add column if not exists consultas_incluidas integer not null default 1,
  add column if not exists consultas_realizadas_iniciais integer not null default 0;

update public.pacientes
set consultas_incluidas = case
  when lower(coalesce(plano, '')) like '%elite%' then 9
  when lower(coalesce(plano, '')) like '%evolu%' then 6
  when lower(coalesce(plano, '')) like '%essencial%' then 3
  else 1
end
where consultas_incluidas = 1;

alter table public.pacientes
  drop constraint if exists pacientes_consultas_incluidas_check,
  add constraint pacientes_consultas_incluidas_check check (consultas_incluidas >= 1),
  drop constraint if exists pacientes_consultas_realizadas_iniciais_check,
  add constraint pacientes_consultas_realizadas_iniciais_check check (consultas_realizadas_iniciais >= 0);

alter table public.consultas
  add column if not exists modalidade text,
  add column if not exists origem text not null default 'manual',
  add column if not exists created_at timestamptz not null default now();

create unique index if not exists consultas_google_event_id_unique
  on public.consultas (google_event_id)
  where google_event_id is not null;

create index if not exists consultas_auth_status_idx
  on public.consultas (auth_id, status);
