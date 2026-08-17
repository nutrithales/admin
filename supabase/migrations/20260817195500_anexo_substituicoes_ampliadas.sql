-- Lista ampliada de substituições calculada pelas porções reais de cada refeição.
-- Mantém a biblioteca clínica isolada e não expõe Vegetais Tipo A/B individualmente.

insert into public.alimentos (
  nome, origem, origem_referencia, kcal_100g, proteina_100g, carboidrato_100g, gordura_100g,
  porcao_padrao_g, categoria, tags_restricao, ativo, grupo_alimentar, unidade_padrao,
  medidas_caseiras, observacoes, alergenos, sinonimos, revisado_manualmente, biblioteca
)
select
  a.nome,a.origem,a.origem_referencia,a.kcal_100g,a.proteina_100g,a.carboidrato_100g,a.gordura_100g,
  a.porcao_padrao_g,a.categoria,a.tags_restricao,a.ativo,a.grupo_alimentar,a.unidade_padrao,
  a.medidas_caseiras,a.observacoes,a.alergenos,a.sinonimos,a.revisado_manualmente,'clinica_v1'
from public.alimentos a
where a.biblioteca='geral' and a.ativo=true
  and a.nome in (
    'Arroz integral cozido','Leite de vaca desnatado UHT','Nestle Iogurte Grego Light',
    'Queijo mucarela','Requeijao light','Patinho cozido ou desfiado','Peito de frango desfiado',
    'Maca argentina','Mel'
  )
  and not exists (
    select 1 from public.alimentos c
    where c.biblioteca='clinica_v1' and lower(c.nome)=lower(a.nome)
  );

insert into public.alimentos (
  nome,origem,origem_referencia,kcal_100g,proteina_100g,carboidrato_100g,gordura_100g,
  porcao_padrao_g,categoria,tags_restricao,ativo,grupo_alimentar,unidade_padrao,
  medidas_caseiras,observacoes,alergenos,sinonimos,revisado_manualmente,biblioteca
)
select * from (values
  ('Morango in natura','TBCA','TBCA BRC0029C',29::numeric,0.82::numeric,6.54::numeric,0.40::numeric,100::numeric,'Frutas e derivados','{}'::text[],true,'fruta','g','[]'::jsonb,'Brasil, média de amostras.','{}'::text[],'{}'::text[],true,'clinica_v1'),
  ('Pera com casca in natura','TBCA','TBCA BRC0030C',54,0.40,14.0,0.23,110,'Frutas e derivados','{}',true,'fruta','g','[{"nome":"unidade média","gramas":110}]','Brasil, média de variedades.','{}','{}',true,'clinica_v1'),
  ('Uva in natura','TBCA','TBCA BRC0033C',56,0.55,13.7,0.20,100,'Frutas e derivados','{}',true,'fruta','g','[]','Brasil.','{}','{}',true,'clinica_v1'),
  ('Manga polpa in natura','TBCA','TBCA BRC0025C',64,0.53,16.0,0.32,100,'Frutas e derivados','{}',true,'fruta','g','[{"nome":"unidade média","gramas":220}]','Brasil, média de variedades.','{}','{}',true,'clinica_v1'),
  ('Melancia polpa in natura','TBCA','TBCA BRC0027C',29,0.70,6.53,0.06,200,'Frutas e derivados','{}',true,'fruta','g','[{"nome":"fatia média","gramas":200}]','Brasil.','{}','{}',true,'clinica_v1'),
  ('Mandioquinha cozida','TBCA','TBCA BRC0054B',77,0.85,18.9,0.17,100,'Vegetais e derivados','{}',true,'carboidrato','g','[{"nome":"colher de servir cheia","gramas":55}]','Sem casca, cozida, drenada, sem óleo e sem sal.','{}','{}',true,'clinica_v1'),
  ('Inhame cozido','TBCA','TBCA BRC0343B',89,2.28,20.4,0.14,100,'Vegetais e derivados','{}',true,'carboidrato','g','[{"nome":"colher de servir cheia","gramas":62}]','Sem casca, cozido e drenado.','{}','{}',true,'clinica_v1'),
  ('Coxão mole sem gordura cozido','TBCA','TBCA BRC0034F',209,32.2,0,8.91,110,'Carnes e derivados','{}',true,'proteina','g','[{"nome":"pedaço médio","gramas":110}]','Sem gordura aparente, cozido, sem óleo e sem sal.','{}','{}',true,'clinica_v1')
) as v(nome,origem,origem_referencia,kcal_100g,proteina_100g,carboidrato_100g,gordura_100g,porcao_padrao_g,categoria,tags_restricao,ativo,grupo_alimentar,unidade_padrao,medidas_caseiras,observacoes,alergenos,sinonimos,revisado_manualmente,biblioteca)
where not exists (
  select 1 from public.alimentos a
  where a.biblioteca='clinica_v1' and lower(a.nome)=lower(v.nome)
);

with mapa(codigo,nome,passo,min_g,max_g,ordem) as (
 values
 ('C_PRATO','Arroz integral cozido',5::numeric,40::numeric,180::numeric,20),
 ('FRUTAS','Maca argentina',5,50,300,20),
 ('LATICINIOS','Leite de vaca desnatado UHT',10,100,400,20),
 ('LATICINIOS','Nestle Iogurte Grego Light',10,80,300,21),
 ('LATICINIOS','Queijo mucarela',5,20,100,22),
 ('LATICINIOS','Requeijao light',5,15,100,23),
 ('P_PRATO','Patinho cozido ou desfiado',10,60,180,20),
 ('P_PRATO','Peito de frango desfiado',10,60,180,21),
 ('P_SALGADA','Peito de frango desfiado',5,30,120,20),
 ('P_SALGADA','Patinho cozido ou desfiado',5,30,120,21),
 ('P_LANCHE','Peito de frango desfiado',5,30,120,20),
 ('FRUTAS','Morango in natura',5,50,350,30),
 ('FRUTAS','Pera com casca in natura',5,50,300,31),
 ('FRUTAS','Uva in natura',5,50,250,32),
 ('FRUTAS','Manga polpa in natura',5,50,250,33),
 ('FRUTAS','Melancia polpa in natura',10,100,450,34),
 ('C_PRATO','Mandioquinha cozida',5,50,300,30),
 ('C_PRATO','Inhame cozido',5,50,300,31),
 ('P_PRATO','Coxão mole sem gordura cozido',10,60,180,30)
)
insert into public.grupo_substituicao_itens (
  grupo_id,alimento_id,principal,ordem,arredondamento_g,porcao_min_g,porcao_max_g
)
select g.id,a.id,false,m.ordem,m.passo,m.min_g,m.max_g
from mapa m
join public.grupos_substituicao g on g.codigo=m.codigo and g.biblioteca='clinica_v1'
join public.alimentos a on lower(a.nome)=lower(m.nome) and a.biblioteca='clinica_v1' and a.ativo=true
where not exists (
  select 1 from public.grupo_substituicao_itens x
  where x.grupo_id=g.id and x.alimento_id=a.id
);

-- Mel não pertence ao grupo de gorduras.
delete from public.grupo_substituicao_itens gsi
using public.grupos_substituicao g, public.alimentos a
where gsi.grupo_id=g.id and gsi.alimento_id=a.id
  and g.biblioteca='clinica_v1' and g.codigo='GORDURAS'
  and lower(a.nome)='mel';

create or replace function public.substituicoes_ampliadas_plano(p_plano_id uuid)
returns table (
  refeicao_id uuid,
  refeicao_nome text,
  refeicao_ordem integer,
  opcao_numero integer,
  opcao_nome text,
  item_id uuid,
  alimento_origem_id uuid,
  alimento_origem_nome text,
  quantidade_origem_g numeric,
  grupo_codigo text,
  grupo_nome text,
  alimento_substituto_id uuid,
  alimento_substituto_nome text,
  quantidade_substituto_g numeric,
  medidas_caseiras jsonb
)
language sql
stable
security definer
set search_path=public
as $$
  select
    r.id,r.nome,r.ordem,coalesce(i.opcao_numero,1),i.opcao_nome,
    i.id,i.alimento_id,ao.nome,i.quantidade_g,
    g.codigo,g.nome,ad.id,ad.nome,
    public.quantidade_equivalente_grupo(
      i.grupo_substituicao_id,i.alimento_id,i.quantidade_g,ad.id
    ),
    ad.medidas_caseiras
  from public.plano_refeicoes r
  join public.plano_refeicao_itens i on i.plano_refeicao_id=r.id
  join public.alimentos ao on ao.id=i.alimento_id
  join public.grupos_substituicao g
    on g.id=i.grupo_substituicao_id and g.ativo=true
  join public.grupo_substituicao_itens gi on gi.grupo_id=g.id
  join public.alimentos ad on ad.id=gi.alimento_id and ad.ativo=true
  where r.plano_estruturado_id=p_plano_id
    and i.alimento_id is not null
    and i.quantidade_g is not null and i.quantidade_g > 0
    and i.grupo_substituicao_id is not null
    and g.codigo not in ('VEG_A','VEG_B')
    and g.macro_referencia <> 'livre'
    and ad.id <> i.alimento_id
    and public.quantidade_equivalente_grupo(
      i.grupo_substituicao_id,i.alimento_id,i.quantidade_g,ad.id
    ) is not null
  order by r.ordem,coalesce(i.opcao_numero,1),i.ordem,gi.ordem,ad.nome;
$$;

grant execute on function public.substituicoes_ampliadas_plano(uuid) to authenticated;
