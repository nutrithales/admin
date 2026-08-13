create table if not exists public.lead_followups_agendados (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  fluxo text not null check (fluxo in ('lead','proposta')),
  dia integer not null,
  etiqueta text not null,
  agendado_para timestamptz not null,
  status text not null default 'pendente' check (status in ('pendente','enviado','cancelado')),
  enviado_em timestamptz,
  created_at timestamptz not null default now(),
  unique (lead_id, fluxo, dia, agendado_para)
);
create index if not exists lead_followups_agendados_due_idx on public.lead_followups_agendados(status, agendado_para);
alter table public.lead_followups_agendados enable row level security;
drop policy if exists "Admins gerenciam followups de leads" on public.lead_followups_agendados;
create policy "Admins gerenciam followups de leads" on public.lead_followups_agendados for all using (public.is_admin()) with check (public.is_admin());
create or replace function public.recriar_followups_lead(p_lead_id uuid,p_fluxo text,p_inicio timestamptz) returns void language plpgsql security definer set search_path=public as $$ begin update public.lead_followups_agendados set status='cancelado' where lead_id=p_lead_id and status='pendente'; if p_fluxo='lead' then insert into public.lead_followups_agendados(lead_id,fluxo,dia,etiqueta,agendado_para) values (p_lead_id,'lead',2,'Lead D2',p_inicio+interval '2 days'),(p_lead_id,'lead',4,'Lead D4',p_inicio+interval '4 days'),(p_lead_id,'lead',8,'Lead D8',p_inicio+interval '8 days'),(p_lead_id,'lead',14,'Lead D14',p_inicio+interval '14 days'),(p_lead_id,'lead',21,'Lead D21',p_inicio+interval '21 days'),(p_lead_id,'lead',30,'Lead D30',p_inicio+interval '30 days'); elsif p_fluxo='proposta' then insert into public.lead_followups_agendados(lead_id,fluxo,dia,etiqueta,agendado_para) values (p_lead_id,'proposta',1,'Proposta D+1',p_inicio+interval '1 day'),(p_lead_id,'proposta',3,'Proposta D+3',p_inicio+interval '3 days'),(p_lead_id,'proposta',6,'Proposta D+6',p_inicio+interval '6 days'),(p_lead_id,'proposta',10,'Proposta D+10',p_inicio+interval '10 days'); end if; end; $$;
create or replace function public.sync_followups_lead_trigger() returns trigger language plpgsql security definer set search_path=public as $$ begin if new.fluxo_followup is distinct from old.fluxo_followup or new.followup_inicio_em is distinct from old.followup_inicio_em then if new.fluxo_followup in ('lead','proposta') and new.followup_inicio_em is not null then perform public.recriar_followups_lead(new.id,new.fluxo_followup,new.followup_inicio_em); elsif new.fluxo_followup is null then update public.lead_followups_agendados set status='cancelado' where lead_id=new.id and status='pendente'; end if; end if; return new; end; $$;
drop trigger if exists trg_sync_followups_lead on public.leads;
create trigger trg_sync_followups_lead after update of fluxo_followup,followup_inicio_em on public.leads for each row execute function public.sync_followups_lead_trigger();
create or replace function public.sync_followups_lead_insert_trigger() returns trigger language plpgsql security definer set search_path=public as $$ begin if new.fluxo_followup in ('lead','proposta') and new.followup_inicio_em is not null then perform public.recriar_followups_lead(new.id,new.fluxo_followup,new.followup_inicio_em); end if; return new; end; $$;
drop trigger if exists trg_sync_followups_lead_insert on public.leads;
create trigger trg_sync_followups_lead_insert after insert on public.leads for each row execute function public.sync_followups_lead_insert_trigger();