create table public.corrida_calendarios (
  paciente_id uuid primary key references public.pacientes(id) on delete cascade,
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  ativo boolean not null default true,
  consentido_em timestamptz not null,
  criado_em timestamptz not null default now(),
  expira_em timestamptz not null,
  ultimo_acesso_em timestamptz,
  revisao integer not null default 0 check (revisao >= 0),
  conteudo_hash text,
  atualizado_em timestamptz not null default now()
);
alter table public.corrida_calendarios enable row level security;
-- Bearer URLs are resolved only server-side, after token verification.
-- Patient/admin metadata is also read through authenticated, explicitly scoped server code.
revoke all on public.corrida_calendarios from anon, authenticated;
grant all on public.corrida_calendarios to service_role;
