create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  telefone text,
  email text,
  origem text,
  plano_interesse text,
  etapa text not null default '01_lead_recebido',
  observacoes text,
  proxima_acao_em timestamptz,
  urgente boolean not null default false,
  convertido_paciente_id uuid references public.pacientes(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint leads_etapa_check check (etapa in (
    '01_lead_recebido', '02_qualificacao', '03_planos_apresentados',
    'follow_up_1', 'follow_up_2', 'follow_up_3'
  ))
);

create index if not exists leads_etapa_updated_idx on public.leads(etapa, updated_at desc);
alter table public.leads enable row level security;
grant select, insert, update, delete on public.leads to authenticated;

drop policy if exists "admins gerenciam leads" on public.leads;
create policy "admins gerenciam leads" on public.leads for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

insert into public.leads (nome, telefone, email, plano_interesse, etapa, observacoes, proxima_acao_em, urgente, created_at, updated_at, convertido_paciente_id)
select p.nome, p.telefone, p.email, p.plano, p.fluxo_etapa, p.fluxo_observacoes,
       p.fluxo_proxima_acao_em, p.fluxo_urgente, coalesce(p.created_at, now()), p.fluxo_updated_at, p.id
from public.pacientes p
where p.fluxo_etapa in ('01_lead_recebido','02_qualificacao','03_planos_apresentados','follow_up_1','follow_up_2','follow_up_3')
  and not exists (select 1 from public.leads l where l.convertido_paciente_id = p.id);
