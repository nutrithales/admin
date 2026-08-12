alter table public.leads drop constraint if exists leads_etapa_check;
alter table public.leads add constraint leads_etapa_check check (etapa in ('01_lead_recebido','02_qualificacao','03_planos_apresentados','04_followup_lead','05_followup_proposta','06_interessado_proximo_mes','07_nao_respondeu','08_convertido'));
alter table public.leads add column if not exists fluxo_followup text;
alter table public.leads add column if not exists followup_inicio_em timestamptz;
alter table public.leads add column if not exists ultimo_followup_enviado_dia integer;
alter table public.leads add column if not exists ultimo_followup_enviado_em timestamptz;
create index if not exists leads_followup_idx on public.leads(fluxo_followup, followup_inicio_em) where fluxo_followup is not null;
