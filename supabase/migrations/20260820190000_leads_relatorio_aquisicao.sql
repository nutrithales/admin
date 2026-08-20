alter table public.leads
  add column if not exists origem_detalhe text,
  add column if not exists campanha text,
  add column if not exists convertido_em timestamptz;

create index if not exists leads_created_at_idx on public.leads (created_at desc);
create index if not exists leads_origem_idx on public.leads (origem);
create index if not exists leads_convertido_em_idx on public.leads (convertido_em) where convertido_em is not null;

comment on column public.leads.origem_detalhe is 'Detalhe complementar da origem do lead, como nome do indicador, parceiro ou contexto.';
comment on column public.leads.campanha is 'Campanha de aquisição associada ao lead, quando aplicável.';
comment on column public.leads.convertido_em is 'Data em que o lead foi marcado como convertido em paciente.';
