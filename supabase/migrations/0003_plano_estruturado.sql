-- Nutri Thales Rosa — Plano Estruturado (builder)
--
-- Fase 2 do construtor inteligente de planos alimentares: o plano em
-- construção/finalizado, montado a partir da biblioteca da Fase 1
-- (alimentos/receitas/refeições-modelo/protocolos). Só ADICIONA — nunca
-- renomeia/remove nada existente.
--
-- `plano_refeicao_itens` referencia OU uma receita (escalada via
-- `scaleRecipe`, com as quantidades finais materializadas em
-- `plano_refeicao_item_ingredientes`) OU um alimento avulso direto
-- (quantidade própria, sem itens filhos) — nunca os dois.

create extension if not exists pgcrypto;

-- =========================================================================
-- planos_estruturados
-- =========================================================================
create table if not exists public.planos_estruturados (
  id uuid primary key default gen_random_uuid(),
  auth_id uuid not null references auth.users (id) on delete cascade,
  protocolo_id uuid not null references public.protocolos (id) on delete restrict,
  titulo text,
  meta_kcal numeric,
  meta_proteina_g numeric,
  meta_carboidrato_g numeric,
  meta_gordura_g numeric,
  status text not null default 'rascunho', -- rascunho | finalizado
  gerado_por_ia boolean not null default false,
  -- orientações finais do plano (Módulo 6/7) — sempre revisadas pelo
  -- nutricionista antes de entrar no PDF exportado.
  observacoes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists planos_estruturados_auth_id_idx on public.planos_estruturados (auth_id);

-- =========================================================================
-- plano_refeicoes — slots do dia, copiados do protocolo ao criar o plano.
-- =========================================================================
create table if not exists public.plano_refeicoes (
  id uuid primary key default gen_random_uuid(),
  plano_estruturado_id uuid not null references public.planos_estruturados (id) on delete cascade,
  nome text not null,
  ordem integer not null default 0,
  meta_kcal numeric,
  meta_proteina_g numeric,
  meta_carboidrato_g numeric,
  meta_gordura_g numeric
);

create index if not exists plano_refeicoes_plano_idx on public.plano_refeicoes (plano_estruturado_id);

-- =========================================================================
-- plano_refeicao_itens — receita (escalada) OU alimento avulso.
-- =========================================================================
create table if not exists public.plano_refeicao_itens (
  id uuid primary key default gen_random_uuid(),
  plano_refeicao_id uuid not null references public.plano_refeicoes (id) on delete cascade,
  receita_id uuid references public.receitas (id) on delete restrict,
  alimento_id uuid references public.alimentos (id) on delete restrict,
  -- só usado quando `alimento_id` (avulso, sem itens filhos).
  quantidade_g numeric,
  -- só usado quando `receita_id` — fator aplicado pelo scaleRecipe.
  fator_escala numeric,
  ordem integer not null default 0,
  constraint plano_refeicao_itens_um_tipo check (
    (receita_id is not null and alimento_id is null) or
    (receita_id is null and alimento_id is not null)
  )
);

create index if not exists plano_refeicao_itens_refeicao_idx on public.plano_refeicao_itens (plano_refeicao_id);

-- =========================================================================
-- plano_refeicao_item_ingredientes — materializa os `receita_itens` já
-- escalados; `receita_item_id` vira null quando o nutricionista substitui
-- manualmente um ingrediente (Fase 3), sinalizando divergência do template.
-- =========================================================================
create table if not exists public.plano_refeicao_item_ingredientes (
  id uuid primary key default gen_random_uuid(),
  plano_refeicao_item_id uuid not null references public.plano_refeicao_itens (id) on delete cascade,
  alimento_id uuid not null references public.alimentos (id) on delete restrict,
  quantidade_g_final numeric not null,
  receita_item_id uuid references public.receita_itens (id) on delete set null,
  ordem integer not null default 0
);

create index if not exists plano_refeicao_item_ingredientes_item_idx on public.plano_refeicao_item_ingredientes (plano_refeicao_item_id);

-- =========================================================================
-- planos_alimentares — o PDF exportado continua sendo uma linha aqui como
-- hoje, agora podendo apontar pro plano estruturado que o gerou.
-- =========================================================================
alter table public.planos_alimentares add column if not exists plano_estruturado_id uuid references public.planos_estruturados (id) on delete set null;

-- =========================================================================
-- RLS — admin gerencia tudo, sem política de leitura pro paciente (ele só
-- recebe o PDF final via `planos_alimentares`, que já tem essa política).
-- =========================================================================
alter table public.planos_estruturados enable row level security;
alter table public.plano_refeicoes enable row level security;
alter table public.plano_refeicao_itens enable row level security;
alter table public.plano_refeicao_item_ingredientes enable row level security;

drop policy if exists "admins gerenciam planos_estruturados" on public.planos_estruturados;
create policy "admins gerenciam planos_estruturados"
  on public.planos_estruturados for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "admins gerenciam plano_refeicoes" on public.plano_refeicoes;
create policy "admins gerenciam plano_refeicoes"
  on public.plano_refeicoes for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "admins gerenciam plano_refeicao_itens" on public.plano_refeicao_itens;
create policy "admins gerenciam plano_refeicao_itens"
  on public.plano_refeicao_itens for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "admins gerenciam plano_refeicao_item_ingredientes" on public.plano_refeicao_item_ingredientes;
create policy "admins gerenciam plano_refeicao_item_ingredientes"
  on public.plano_refeicao_item_ingredientes for all
  using (public.is_admin())
  with check (public.is_admin());
