create table if not exists public.pagamentos (
  id uuid primary key default gen_random_uuid(),
  paciente_id uuid not null references public.pacientes(id) on delete restrict,
  servico text not null check (servico in ('consulta_avulsa','plano_essencial','plano_evolucao','plano_elite_premium')),
  valor numeric(10,2) not null check (valor >= 0),
  pago_em date not null default current_date,
  forma_pagamento text,
  descricao_nota text not null,
  nota_emitida boolean not null default false,
  observacoes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists pagamentos_pago_em_idx on public.pagamentos(pago_em desc);
create index if not exists pagamentos_paciente_id_idx on public.pagamentos(paciente_id);
alter table public.pagamentos enable row level security;
create policy "Administradores gerenciam pagamentos" on public.pagamentos for all to authenticated using (exists (select 1 from public.administradores a where a.auth_id = auth.uid())) with check (exists (select 1 from public.administradores a where a.auth_id = auth.uid()));