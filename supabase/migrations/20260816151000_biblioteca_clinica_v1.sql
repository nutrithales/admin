-- Biblioteca Clínica v1: grupos de substituição, papéis nutricionais e
-- materialização da origem clínica nos itens do plano.

alter table public.alimentos
  add column if not exists biblioteca text not null default 'geral';

alter table public.refeicoes_modelo
  add column if not exists biblioteca text not null default 'geral';

create table if not exists public.grupos_substituicao (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,
  nome text not null,
  macro_referencia text not null check (macro_referencia in ('proteina', 'carboidrato', 'gordura', 'energia', 'livre')),
  livre boolean not null default false,
  observacoes text,
  biblioteca text not null default 'clinica_v1',
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.grupo_substituicao_itens (
  id uuid primary key default gen_random_uuid(),
  grupo_id uuid not null references public.grupos_substituicao(id) on delete cascade,
  alimento_id uuid not null references public.alimentos(id) on delete restrict,
  principal boolean not null default false,
  ordem integer not null default 0,
  arredondamento_g numeric not null default 5 check (arredondamento_g > 0),
  porcao_min_g numeric,
  porcao_max_g numeric,
  created_at timestamptz not null default now(),
  unique (grupo_id, alimento_id),
  check (porcao_min_g is null or porcao_min_g >= 0),
  check (porcao_max_g is null or porcao_max_g > 0),
  check (porcao_min_g is null or porcao_max_g is null or porcao_max_g >= porcao_min_g)
);

alter table public.refeicao_modelo_opcao_itens
  add column if not exists grupo_substituicao_id uuid references public.grupos_substituicao(id) on delete set null,
  add column if not exists papel_macro text,
  add column if not exists contabiliza_macros boolean not null default true,
  add column if not exists quantidade_min_g numeric,
  add column if not exists quantidade_max_g numeric,
  add column if not exists arredondamento_g numeric not null default 5;

alter table public.refeicao_modelo_opcao_itens
  drop constraint if exists refeicao_modelo_opcao_itens_papel_macro_check;
alter table public.refeicao_modelo_opcao_itens
  add constraint refeicao_modelo_opcao_itens_papel_macro_check
  check (papel_macro is null or papel_macro in ('proteina', 'carboidrato', 'gordura', 'misto', 'vegetal_b', 'livre'));

alter table public.plano_refeicao_itens
  add column if not exists grupo_substituicao_id uuid references public.grupos_substituicao(id) on delete set null,
  add column if not exists papel_macro text,
  add column if not exists contabiliza_macros boolean not null default true,
  add column if not exists quantidade_min_g numeric,
  add column if not exists quantidade_max_g numeric,
  add column if not exists arredondamento_g numeric not null default 5;

alter table public.plano_refeicao_itens
  drop constraint if exists plano_refeicao_itens_papel_macro_check;
alter table public.plano_refeicao_itens
  add constraint plano_refeicao_itens_papel_macro_check
  check (papel_macro is null or papel_macro in ('proteina', 'carboidrato', 'gordura', 'misto', 'vegetal_b', 'livre'));

create index if not exists idx_grupo_substituicao_itens_grupo on public.grupo_substituicao_itens(grupo_id, ordem);
create index if not exists idx_grupo_substituicao_itens_alimento on public.grupo_substituicao_itens(alimento_id);
create index if not exists idx_refeicao_modelo_itens_grupo on public.refeicao_modelo_opcao_itens(grupo_substituicao_id);
create index if not exists idx_plano_refeicao_itens_grupo on public.plano_refeicao_itens(grupo_substituicao_id);
create index if not exists idx_alimentos_biblioteca on public.alimentos(biblioteca, ativo);
create index if not exists idx_refeicoes_modelo_biblioteca on public.refeicoes_modelo(biblioteca, ativo);

alter table public.grupos_substituicao enable row level security;
alter table public.grupo_substituicao_itens enable row level security;

drop policy if exists "admins gerenciam grupos_substituicao" on public.grupos_substituicao;
create policy "admins gerenciam grupos_substituicao"
  on public.grupos_substituicao for all
  using (is_admin())
  with check (is_admin());

drop policy if exists "admins gerenciam grupo_substituicao_itens" on public.grupo_substituicao_itens;
create policy "admins gerenciam grupo_substituicao_itens"
  on public.grupo_substituicao_itens for all
  using (is_admin())
  with check (is_admin());
