-- Nutri Thales Rosa — Biblioteca Nutricional
--
-- Fase 1 do construtor inteligente de planos alimentares: adiciona a
-- biblioteca estruturada (alimentos, receitas, refeições-modelo,
-- protocolos) que o builder e a IA vão consumir depois. Só ADICIONA
-- colunas/tabelas/políticas — nunca renomeia ou remove nada existente.
-- Idempotente: seguro rodar em projeto novo ou já com 0001 aplicado.

create extension if not exists pgcrypto;
-- Instalado em `extensions`, não `public` — boa prática do linter de
-- segurança do Supabase (extensões soltas em `public` ficam expostas
-- desnecessariamente via PostgREST).
create extension if not exists pg_trgm with schema extensions;

-- =========================================================================
-- pacientes — campos que influenciam a dieta (Módulo 1)
-- =========================================================================
alter table public.pacientes add column if not exists peso_kg numeric;
alter table public.pacientes add column if not exists altura_cm numeric;
alter table public.pacientes add column if not exists objetivo text;
alter table public.pacientes add column if not exists nivel_atividade text;
alter table public.pacientes add column if not exists treino_frequencia_semanal integer;
alter table public.pacientes add column if not exists restricoes_alimentares text[] not null default '{}'::text[];
alter table public.pacientes add column if not exists preferencias_alimentares text;

-- =========================================================================
-- alimentos (Módulo 2) — multi-fonte, sempre normalizado para por 100g.
-- `origem` é texto livre por design (mesmo padrão de `biblioteca.tipo` /
-- `checkins.origem`): fontes de hoje são tbca_7_3, fabricante, tucunduva,
-- usda, fao, web, manual — a ordem de prioridade entre elas é regra de
-- exibição (ver src/lib/nutrition/origem.ts), não coluna.
-- =========================================================================
create table if not exists public.alimentos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  origem text not null,
  origem_referencia text,
  kcal_100g numeric not null default 0,
  proteina_100g numeric not null default 0,
  carboidrato_100g numeric not null default 0,
  gordura_100g numeric not null default 0,
  porcao_padrao_g numeric,
  categoria text,
  tags_restricao text[] not null default '{}'::text[],
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists alimentos_nome_trgm_idx on public.alimentos using gin (nome extensions.gin_trgm_ops);
create index if not exists alimentos_origem_idx on public.alimentos (origem);

alter table public.alimentos enable row level security;

drop policy if exists "admins gerenciam alimentos" on public.alimentos;
create policy "admins gerenciam alimentos"
  on public.alimentos for all
  using (public.is_admin())
  with check (public.is_admin());

-- =========================================================================
-- receitas + receita_itens (Módulo 3) — o coração do sistema. Macros são
-- sempre calculados deterministicamente a partir dos itens (soma de
-- quantidade × macro/100g), nunca por IA.
-- =========================================================================
create table if not exists public.receitas (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  modo_preparo text,
  tags text[] not null default '{}'::text[],
  ativo boolean not null default true,
  -- preenchido quando esta receita é uma variante gerada por ajuste de IA
  -- (Fase 4) — a receita original nunca é sobrescrita.
  origem_receita_id uuid references public.receitas (id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.receita_itens (
  id uuid primary key default gen_random_uuid(),
  receita_id uuid not null references public.receitas (id) on delete cascade,
  alimento_id uuid not null references public.alimentos (id) on delete restrict,
  quantidade_base_g numeric not null,
  -- usado pelo motor de escalonamento (src/lib/nutrition/scale-recipe.ts)
  papel_macro text not null default 'livre',
  -- rótulo livre (ex. "Proteína", "Molho") para a Receita Modular: trocar
  -- só o item daquele componente e recalcular a receita inteira.
  componente text,
  ordem integer not null default 0
);

create index if not exists receita_itens_receita_idx on public.receita_itens (receita_id);
create index if not exists receita_itens_alimento_idx on public.receita_itens (alimento_id);

alter table public.receitas enable row level security;
alter table public.receita_itens enable row level security;

drop policy if exists "admins gerenciam receitas" on public.receitas;
create policy "admins gerenciam receitas"
  on public.receitas for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "admins gerenciam receita_itens" on public.receita_itens;
create policy "admins gerenciam receita_itens"
  on public.receita_itens for all
  using (public.is_admin())
  with check (public.is_admin());

-- =========================================================================
-- refeicoes_modelo (Módulo 4) — diferente de receita: é um slot com
-- opções alternativas (ex. Café da manhã → Opção 1 | Opção 2 | Opção 3),
-- cada opção composta de receitas e/ou alimentos avulsos.
-- =========================================================================
create table if not exists public.refeicoes_modelo (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  tags text[] not null default '{}'::text[],
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.refeicao_modelo_opcoes (
  id uuid primary key default gen_random_uuid(),
  refeicao_modelo_id uuid not null references public.refeicoes_modelo (id) on delete cascade,
  nome text not null default 'Opção',
  ordem integer not null default 0
);

create table if not exists public.refeicao_modelo_opcao_itens (
  id uuid primary key default gen_random_uuid(),
  opcao_id uuid not null references public.refeicao_modelo_opcoes (id) on delete cascade,
  receita_id uuid references public.receitas (id) on delete restrict,
  alimento_id uuid references public.alimentos (id) on delete restrict,
  -- só usado quando o item é um alimento avulso; receita usa sua própria
  -- quantidade base (escalada depois pelo builder).
  quantidade_g numeric,
  ordem integer not null default 0,
  constraint refeicao_modelo_opcao_itens_um_tipo check (
    (receita_id is not null and alimento_id is null) or
    (receita_id is null and alimento_id is not null)
  )
);

create index if not exists refeicao_modelo_opcoes_refeicao_idx on public.refeicao_modelo_opcoes (refeicao_modelo_id);
create index if not exists refeicao_modelo_opcao_itens_opcao_idx on public.refeicao_modelo_opcao_itens (opcao_id);

alter table public.refeicoes_modelo enable row level security;
alter table public.refeicao_modelo_opcoes enable row level security;
alter table public.refeicao_modelo_opcao_itens enable row level security;

drop policy if exists "admins gerenciam refeicoes_modelo" on public.refeicoes_modelo;
create policy "admins gerenciam refeicoes_modelo"
  on public.refeicoes_modelo for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "admins gerenciam refeicao_modelo_opcoes" on public.refeicao_modelo_opcoes;
create policy "admins gerenciam refeicao_modelo_opcoes"
  on public.refeicao_modelo_opcoes for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "admins gerenciam refeicao_modelo_opcao_itens" on public.refeicao_modelo_opcao_itens;
create policy "admins gerenciam refeicao_modelo_opcao_itens"
  on public.refeicao_modelo_opcao_itens for all
  using (public.is_admin())
  with check (public.is_admin());

-- =========================================================================
-- protocolos (Módulo 5) — a metodologia Nutri Thales Rosa, estruturada.
-- Não é instrução solta pra IA seguir "de bom senso": define os slots de
-- refeição do dia, quais refeições/receitas priorizar em cada um, e as
-- faixas de macro por objetivo. A IA (Módulo 6) fica restrita a isso.
-- =========================================================================
create table if not exists public.protocolos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  descricao text,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.protocolo_refeicoes (
  id uuid primary key default gen_random_uuid(),
  protocolo_id uuid not null references public.protocolos (id) on delete cascade,
  nome text not null,
  ordem integer not null default 0,
  horario_sugerido time,
  percentual_kcal numeric
);

create table if not exists public.protocolo_refeicoes_preferidas (
  id uuid primary key default gen_random_uuid(),
  protocolo_refeicao_id uuid not null references public.protocolo_refeicoes (id) on delete cascade,
  refeicao_modelo_id uuid not null references public.refeicoes_modelo (id) on delete cascade,
  ordem integer not null default 0
);

create table if not exists public.protocolo_receitas_preferidas (
  id uuid primary key default gen_random_uuid(),
  protocolo_id uuid not null references public.protocolos (id) on delete cascade,
  receita_id uuid not null references public.receitas (id) on delete cascade,
  ordem integer not null default 0
);

create table if not exists public.protocolo_regras_macro (
  id uuid primary key default gen_random_uuid(),
  protocolo_id uuid not null references public.protocolos (id) on delete cascade,
  proteina_g_por_kg_min numeric,
  proteina_g_por_kg_max numeric,
  gordura_percentual_kcal_min numeric,
  gordura_percentual_kcal_max numeric
);

create index if not exists protocolo_refeicoes_protocolo_idx on public.protocolo_refeicoes (protocolo_id);
create index if not exists protocolo_refeicoes_preferidas_slot_idx on public.protocolo_refeicoes_preferidas (protocolo_refeicao_id);
create index if not exists protocolo_receitas_preferidas_protocolo_idx on public.protocolo_receitas_preferidas (protocolo_id);
create index if not exists protocolo_regras_macro_protocolo_idx on public.protocolo_regras_macro (protocolo_id);

alter table public.protocolos enable row level security;
alter table public.protocolo_refeicoes enable row level security;
alter table public.protocolo_refeicoes_preferidas enable row level security;
alter table public.protocolo_receitas_preferidas enable row level security;
alter table public.protocolo_regras_macro enable row level security;

drop policy if exists "admins gerenciam protocolos" on public.protocolos;
create policy "admins gerenciam protocolos"
  on public.protocolos for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "admins gerenciam protocolo_refeicoes" on public.protocolo_refeicoes;
create policy "admins gerenciam protocolo_refeicoes"
  on public.protocolo_refeicoes for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "admins gerenciam protocolo_refeicoes_preferidas" on public.protocolo_refeicoes_preferidas;
create policy "admins gerenciam protocolo_refeicoes_preferidas"
  on public.protocolo_refeicoes_preferidas for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "admins gerenciam protocolo_receitas_preferidas" on public.protocolo_receitas_preferidas;
create policy "admins gerenciam protocolo_receitas_preferidas"
  on public.protocolo_receitas_preferidas for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "admins gerenciam protocolo_regras_macro" on public.protocolo_regras_macro;
create policy "admins gerenciam protocolo_regras_macro"
  on public.protocolo_regras_macro for all
  using (public.is_admin())
  with check (public.is_admin());
