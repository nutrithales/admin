-- Inclui whey concentrado como alavanca proteica de bowls e melhora a
-- composição dos sanduíches para que o ajuste automático não force porções.
insert into public.alimentos
(nome,origem,origem_referencia,kcal_100g,proteina_100g,carboidrato_100g,gordura_100g,
 porcao_padrao_g,categoria,grupo_alimentar,unidade_padrao,medidas_caseiras,tags_restricao,
 alergenos,sinonimos,revisado_manualmente,ativo,biblioteca,marca)
select 'Whey protein concentrado — baunilha','Fabricante','INTEGRALMEDICA-WPC-BAUNILHA-2026',406.67,70,17,6.33,
       30,'proteina','proteina','g','[{"unidade":"Porção (2 dosadores)","peso_g":30}]'::jsonb,
       array['leite'],array['leite','soja'],array['whey','whey concentrado'],true,true,'clinica_v1','Integralmédica'
where not exists(select 1 from public.alimentos where origem_referencia='INTEGRALMEDICA-WPC-BAUNILHA-2026' and biblioteca='clinica_v1');

update public.grupo_substituicao_itens gsi set principal=false,ordem=ordem+1
from public.grupos_substituicao g
where gsi.grupo_id=g.id and g.codigo='P_LANCHE' and g.biblioteca='clinica_v1';

insert into public.grupo_substituicao_itens(grupo_id,alimento_id,principal,ordem,arredondamento_g,porcao_min_g,porcao_max_g)
select g.id,a.id,true,0,5,10,45
from public.grupos_substituicao g, public.alimentos a
where g.codigo='P_LANCHE' and g.biblioteca='clinica_v1'
  and a.origem_referencia='INTEGRALMEDICA-WPC-BAUNILHA-2026' and a.biblioteca='clinica_v1'
on conflict(grupo_id,alimento_id) do update set principal=true,ordem=0,arredondamento_g=5,porcao_min_g=10,porcao_max_g=45;

-- Troca leite em pó por whey nos dois bowls clínicos.
update public.refeicao_modelo_opcao_itens i
set alimento_id=w.id,quantidade_g=20,quantidade_min_g=10,quantidade_max_g=45,arredondamento_g=5
from public.refeicao_modelo_opcoes o, public.refeicoes_modelo r, public.alimentos atual, public.alimentos w
where i.opcao_id=o.id and o.refeicao_modelo_id=r.id
  and r.nome in ('B02 Bowl proteico','B11 Bowl proteico da tarde') and r.biblioteca='clinica_v1'
  and i.alimento_id=atual.id and atual.origem_referencia='BRC0038G'
  and w.origem_referencia='INTEGRALMEDICA-WPC-BAUNILHA-2026' and w.biblioteca='clinica_v1';

-- Completa os sanduíches com gordura ajustável culinariamente simples.
insert into public.refeicao_modelo_opcao_itens
(opcao_id,alimento_id,quantidade_g,ordem,grupo_substituicao_id,papel_macro,contabiliza_macros,quantidade_min_g,quantidade_max_g,arredondamento_g)
select o.id,a.id,30,3,g.id,'gordura',true,15,100,5
from public.refeicoes_modelo r
join public.refeicao_modelo_opcoes o on o.refeicao_modelo_id=r.id and o.ordem=0
join public.alimentos a on a.origem_referencia='BRC0001C' and a.biblioteca='clinica_v1'
join public.grupos_substituicao g on g.codigo='GORDURAS' and g.biblioteca='clinica_v1'
where r.nome='B06 Mini sanduíche' and r.biblioteca='clinica_v1'
  and not exists(select 1 from public.refeicao_modelo_opcao_itens x where x.opcao_id=o.id and x.papel_macro='gordura');

insert into public.refeicao_modelo_opcao_itens
(opcao_id,alimento_id,quantidade_g,ordem,grupo_substituicao_id,papel_macro,contabiliza_macros,quantidade_min_g,quantidade_max_g,arredondamento_g)
select o.id,a.id,45,4,g.id,'gordura',true,15,120,5
from public.refeicoes_modelo r
join public.refeicao_modelo_opcoes o on o.refeicao_modelo_id=r.id and o.ordem=0
join public.alimentos a on a.origem_referencia='BRC0001C' and a.biblioteca='clinica_v1'
join public.grupos_substituicao g on g.codigo='GORDURAS' and g.biblioteca='clinica_v1'
where r.nome='B10 Sanduíche completo' and r.biblioteca='clinica_v1'
  and not exists(select 1 from public.refeicao_modelo_opcao_itens x where x.opcao_id=o.id and x.papel_macro='gordura');

-- Para lanches pequenos, o mini sanduíche oferece melhor faixa de ajuste.
with modelos(nome,ordem_nova) as (values
  ('B06 Mini sanduíche',0),('B05 Fruta, cottage e castanhas',1),('B04 Iogurte, fruta e aveia',2)
)
update public.protocolo_refeicoes_preferidas pref
set ordem=m.ordem_nova
from modelos m,public.refeicoes_modelo r
where pref.refeicao_modelo_id=r.id and r.nome=m.nome and r.biblioteca='clinica_v1';
