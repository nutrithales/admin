-- Nutri Thales Rosa — Extensão da biblioteca nutricional
--
-- 1) `alimentos`: base mestre completa (micronutrientes, medidas caseiras,
--    fatores de cocção/correção, dados de produto industrializado).
-- 2) `receitas`: rendimento, peso final e tempo de preparo.
-- 3) `refeicoes_modelo`/`refeicao_modelo_opcoes`: metas de macro por grupo
--    (pra validar equivalência entre opções — "toda refeição cadastrada
--    numa grupo de equivalência deve ficar dentro da tolerância", regra
--    do sistema, não recomendação), observações em dois níveis (grupo e
--    opção específica) e tags por opção.
--
-- Só ADICIONA — nunca renomeia/remove nada existente.

alter table public.alimentos add column if not exists grupo_alimentar text;
alter table public.alimentos add column if not exists unidade_padrao text;
alter table public.alimentos add column if not exists medidas_caseiras jsonb not null default '[]'::jsonb;
alter table public.alimentos add column if not exists fibra_100g numeric;
alter table public.alimentos add column if not exists acucares_100g numeric;
alter table public.alimentos add column if not exists sodio_100g numeric;
alter table public.alimentos add column if not exists calcio_100g numeric;
alter table public.alimentos add column if not exists ferro_100g numeric;
alter table public.alimentos add column if not exists potassio_100g numeric;
alter table public.alimentos add column if not exists magnesio_100g numeric;
alter table public.alimentos add column if not exists vitamina_a_100g numeric;
alter table public.alimentos add column if not exists vitamina_c_100g numeric;
alter table public.alimentos add column if not exists indice_glicemico numeric;
alter table public.alimentos add column if not exists carga_glicemica numeric;
alter table public.alimentos add column if not exists fator_coccao numeric;
alter table public.alimentos add column if not exists fator_correcao numeric;
alter table public.alimentos add column if not exists observacoes text;
alter table public.alimentos add column if not exists marca text;
alter table public.alimentos add column if not exists ingredientes text;
alter table public.alimentos add column if not exists alergenos text[] not null default '{}'::text[];

alter table public.receitas add column if not exists rendimento_porcoes integer;
alter table public.receitas add column if not exists peso_final_g numeric;
alter table public.receitas add column if not exists tempo_preparo_min integer;

alter table public.refeicoes_modelo add column if not exists observacoes text;
alter table public.refeicoes_modelo add column if not exists meta_kcal numeric;
alter table public.refeicoes_modelo add column if not exists meta_proteina_g numeric;
alter table public.refeicoes_modelo add column if not exists meta_carboidrato_g numeric;
alter table public.refeicoes_modelo add column if not exists meta_gordura_g numeric;

alter table public.refeicao_modelo_opcoes add column if not exists tags text[] not null default '{}'::text[];
alter table public.refeicao_modelo_opcoes add column if not exists observacoes text;
alter table public.refeicao_modelo_opcoes add column if not exists peso_total_g numeric;
