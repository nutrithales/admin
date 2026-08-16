-- Biblioteca Clínica v1 — Matriz B com 15 refeições-modelo e substituições.
-- Dados de composição: TBCA 7.3; valores por 100 g, salvo indicação na medida caseira.

do $$
begin
  -- Reexecução segura da biblioteca clínica sem tocar nos dados de teste.
  delete from public.protocolo_refeicoes_preferidas where refeicao_modelo_id in (select id from public.refeicoes_modelo where biblioteca='clinica_v1');
  delete from public.refeicao_modelo_opcao_itens where opcao_id in (select o.id from public.refeicao_modelo_opcoes o join public.refeicoes_modelo r on r.id=o.refeicao_modelo_id where r.biblioteca='clinica_v1');
  delete from public.refeicao_modelo_opcoes where refeicao_modelo_id in (select id from public.refeicoes_modelo where biblioteca='clinica_v1');
  delete from public.refeicoes_modelo where biblioteca='clinica_v1';
  delete from public.grupo_substituicao_itens where grupo_id in (select id from public.grupos_substituicao where biblioteca='clinica_v1');
  delete from public.grupos_substituicao where biblioteca='clinica_v1';
  delete from public.alimentos where biblioteca='clinica_v1';
end $$;

with dados(ref,nome,kcal,carbo,proteina,gordura,porcao,unidade,medidas,categoria) as (values
    ('BRC0149A','Pão de forma integral',232,45.9,10.7,1.79,25,'g','[{"unidade":"Fatia","peso_g":25}]'::jsonb,'carboidrato'),
    ('BRC0002A','Pão francês',300,61.6,9.83,2.12,50,'g','[{"unidade":"Unidade média","peso_g":50}]'::jsonb,'carboidrato'),
    ('BRC0003A','Pão de forma tradicional',256,49.6,10.1,2.49,25,'g','[{"unidade":"Fatia","peso_g":25}]'::jsonb,'carboidrato'),
    ('BRC0409A','Cuscuz de milho cozido',109,24.7,2.16,0.68,70,'g','[{"unidade":"Porção","peso_g":70}]'::jsonb,'carboidrato'),
    ('BRC0024A','Aveia em flocos finos',379,64.5,15.6,8.6,15,'g','[{"unidade":"Colher de sopa cheia","peso_g":15}]'::jsonb,'carboidrato'),
    ('BRC0018A','Arroz branco cozido',131,30.0,2.38,0.41,85,'g','[{"unidade":"Escumadeira cheia","peso_g":85},{"unidade":"Colher de servir cheia","peso_g":55}]'::jsonb,'carboidrato'),
    ('BRC0116A','Macarrão de trigo cozido',101,21.0,3.73,0.58,100,'g','[]'::jsonb,'carboidrato'),
    ('BRC0041B','Batata inglesa cozida',52,12.3,1.33,0.05,100,'g','[{"unidade":"Escumadeira cheia","peso_g":50}]'::jsonb,'carboidrato'),
    ('BRC0042B','Batata-doce cozida',92,23.1,0.85,0.18,100,'g','[{"unidade":"Colher de sopa cheia","peso_g":42}]'::jsonb,'carboidrato'),
    ('BRC0053B','Mandioca cozida',120,29.8,0.64,0.24,100,'g','[{"unidade":"Colher de sopa cheia","peso_g":37}]'::jsonb,'carboidrato'),
    ('BRC0011C','Banana prata in natura',107,25.9,1.11,0.28,80,'g','[]'::jsonb,'fruta'),
    ('BRC0064C','Maçã Fuji com casca',59,15.2,0.29,0.0,130,'g','[{"unidade":"Unidade média","peso_g":130}]'::jsonb,'fruta'),
    ('BRC0044C','Mamão papaia',43,10.2,0.5,0.2,150,'g','[]'::jsonb,'fruta'),
    ('BRC0020C','Laranja pera',37,8.63,0.87,0.21,140,'g','[{"unidade":"Unidade média","peso_g":140}]'::jsonb,'fruta'),
    ('BRC0002C','Abacaxi',50,11.6,0.68,0.33,150,'g','[{"unidade":"Fatia média","peso_g":75}]'::jsonb,'fruta'),
    ('BRC0010J','Ovo de galinha cozido',125,1.38,10.4,8.7,100,'g','[{"unidade":"Unidade","peso_g":50}]'::jsonb,'proteina'),
    ('BRC0194F','Peito de frango cozido sem pele',154,0,31.3,3.16,120,'g','[{"unidade":"Filé médio","peso_g":110}]'::jsonb,'proteina'),
    ('BRC0053N','Atum sólido em conserva light',115,1.68,25.8,0.6,80,'g','[{"unidade":"Porção","peso_g":60}]'::jsonb,'proteina'),
    ('BRC0158G','Queijo cottage',116,3.2,9.7,7.1,60,'g','[]'::jsonb,'proteina'),
    ('BRC0075N','Ricota light',137,5.08,11.4,7.91,60,'g','[]'::jsonb,'proteina'),
    ('BRC0036N','Queijo minas frescal light',161,0.42,18.7,9.4,50,'g','[]'::jsonb,'proteina'),
    ('BRC0637F','Patinho bovino refogado sem sal',164,0.75,27.9,5.61,120,'g','[]'::jsonb,'proteina'),
    ('BRC0486E','Tilápia grelhada sem óleo e sal',90,0,18.5,1.73,150,'g','[{"unidade":"Filé médio","peso_g":100}]'::jsonb,'proteina'),
    ('BRC0163F','Lombo suíno assado sem óleo e sal',200,0,35.7,6.4,100,'g','[{"unidade":"Porção média","peso_g":110}]'::jsonb,'proteina'),
    ('BRC0023G','Iogurte natural desnatado',55,8.3,4.24,0.52,170,'g','[{"unidade":"Pote","peso_g":170}]'::jsonb,'laticinio'),
    ('BRC0128G','Kefir de leite integral',47,2.65,3.91,2.34,165,'ml','[{"unidade":"Copo pequeno","peso_g":165}]'::jsonb,'laticinio'),
    ('BRC0038G','Leite em pó desnatado',355,52.1,34.4,1.06,20,'g','[{"unidade":"Colher de sopa cheia","peso_g":10}]'::jsonb,'proteina'),
    ('BRC0254T','Feijão carioca cozido drenado',133,26.3,9.61,0.81,80,'g','[{"unidade":"Concha rasa","peso_g":80}]'::jsonb,'leguminosa'),
    ('BRC0018T','Lentilha cozida drenada',99,19.6,7.3,0.46,85,'g','[{"unidade":"Concha cheia","peso_g":85}]'::jsonb,'leguminosa'),
    ('BRC0028T','Feijão branco cozido',130,25.1,9.73,0.35,80,'g','[]'::jsonb,'leguminosa'),
    ('BRC0024T','Ervilha cozida',93,18.1,6.62,0.62,80,'g','[]'::jsonb,'leguminosa'),
    ('BRC0176A','Milho verde cozido',129,26.7,6.16,0.57,80,'g','[]'::jsonb,'vegetal_b'),
    ('BRC0002D','Azeite de oliva',900,0,0,100,8,'g','[{"unidade":"Colher de sopa rasa","peso_g":8},{"unidade":"Colher de sobremesa rasa","peso_g":5}]'::jsonb,'gordura'),
    ('BRC0001C','Abacate',76,5.84,1.15,6.21,45,'g','[{"unidade":"Colher de sopa cheia","peso_g":45}]'::jsonb,'gordura'),
    ('BRC0021T','Amendoim torrado',626,16.9,27.5,51.8,15,'g','[{"unidade":"Colher de sopa rasa","peso_g":14}]'::jsonb,'gordura'),
    ('BRC0002U','Castanha de caju torrada',617,24.0,20.7,49.6,15,'g','[]'::jsonb,'gordura'),
    ('BRC0016U','Gergelim',601,21.6,21.2,50.4,15,'g','[{"unidade":"Colher de sopa rasa","peso_g":15}]'::jsonb,'gordura'),
    ('BRC0290T','Pasta de amendoim integral',615,21.6,26.5,48.4,15,'g','[]'::jsonb,'gordura'),
    ('BRC0047B','Cenoura cozida',17,4.31,0.54,0.2,100,'g','[]'::jsonb,'vegetal_b'),
    ('BRC0044B','Beterraba cozida',27,6.29,1.23,0.09,100,'g','[]'::jsonb,'vegetal_b'),
    ('BRC0059B','Abóbora cabotiá cozida',50,10.8,1.44,0.73,100,'g','[]'::jsonb,'vegetal_b'),
    ('BRC0063B','Alface americana',6,1.5,0.41,0.11,50,'g','[]'::jsonb,'vegetal_a'),
    ('BRC0035B','Tomate cru',18,3.82,1.04,0.17,100,'g','[]'::jsonb,'vegetal_a'),
    ('BRC0030B','Pepino com casca cru',10,2.24,0.7,0.09,100,'g','[]'::jsonb,'vegetal_a'),
    ('BRC0045B','Brócolis cozido',27,4.44,2.71,0.54,100,'g','[]'::jsonb,'vegetal_a'),
    ('BRC0156B','Berinjela grelhada',23,5.71,1.26,0.16,100,'g','[]'::jsonb,'vegetal_a'),
    ('BRC0275T','Feijão preto cozido no vapor',266,40.0,9.05,1.09,80,'g','[]'::jsonb,'leguminosa')
)
insert into public.alimentos
(nome,origem,origem_referencia,kcal_100g,proteina_100g,carboidrato_100g,gordura_100g,
 porcao_padrao_g,categoria,grupo_alimentar,unidade_padrao,medidas_caseiras,tags_restricao,
 alergenos,sinonimos,revisado_manualmente,ativo,biblioteca)
select nome,'TBCA 7.3',ref,kcal,proteina,carbo,gordura,porcao,categoria,categoria,unidade,
       medidas,'{}'::text[],'{}'::text[],'{}'::text[],true,true,'clinica_v1'
from dados;

with dados(codigo,nome,macro_referencia,livre,observacoes) as (values
    ('C_CAFE','Carboidratos de café e lanches','carboidrato',false,'Pães, cuscuz e aveia; equivalência por carboidrato.'),
    ('FRUTAS','Frutas','carboidrato',false,'Equivalência por carboidrato com arredondamento culinário.'),
    ('P_SALGADA','Proteínas para café e lanches salgados','proteina',false,'Fontes proteicas para ovos/sanduíches.'),
    ('P_PRATO','Proteínas de almoço e jantar','proteina',false,'Carnes e pescados; equivalência por proteína.'),
    ('LATICINIOS','Laticínios e derivados','energia',false,'Alternativas de laticínios; conferir adequação culinária.'),
    ('P_LANCHE','Proteínas práticas de lanches','proteina',false,'Leite em pó desnatado e outras fontes proteicas práticas.'),
    ('C_PRATO','Carboidratos de almoço e jantar','carboidrato',false,'Arroz, massa e tubérculos; equivalência por carboidrato.'),
    ('LEGUMINOSAS','Feijões e leguminosas','carboidrato',false,'Leguminosas contabilizadas; equivalência por carboidrato.'),
    ('GORDURAS','Fontes de gordura','gordura',false,'Azeite, oleaginosas, sementes e pastas.'),
    ('VEG_A','Vegetais Tipo A — livre','livre',true,'Livre em todos os planos; não usado para fechar kcal/macros.'),
    ('VEG_B','Vegetais Tipo B — contabilizado','energia',false,'Porção contabilizada, mas não usada como alavanca de fechamento.')
)
insert into public.grupos_substituicao
(codigo,nome,macro_referencia,livre,observacoes,biblioteca,ativo)
select codigo,nome,macro_referencia,livre,observacoes,'clinica_v1',true from dados;

with dados(codigo,ref,principal,ordem,arredondamento_g,porcao_min_g,porcao_max_g) as (values
    ('C_CAFE','BRC0149A',true,0,5,25,150),
    ('C_CAFE','BRC0002A',false,1,5,25,150),
    ('C_CAFE','BRC0003A',false,2,5,25,150),
    ('C_CAFE','BRC0409A',false,3,5,30,220),
    ('C_CAFE','BRC0024A',false,4,5,10,80),
    ('FRUTAS','BRC0011C',true,0,5,60,200),
    ('FRUTAS','BRC0064C',false,1,5,60,250),
    ('FRUTAS','BRC0044C',false,2,5,80,300),
    ('FRUTAS','BRC0020C',false,3,5,80,300),
    ('FRUTAS','BRC0002C',false,4,5,80,300),
    ('P_SALGADA','BRC0010J',true,0,50,50,200),
    ('P_SALGADA','BRC0194F',false,1,10,50,180),
    ('P_SALGADA','BRC0053N',false,2,10,40,160),
    ('P_SALGADA','BRC0158G',false,3,5,40,180),
    ('P_SALGADA','BRC0075N',false,4,5,40,180),
    ('P_SALGADA','BRC0036N',false,5,5,30,150),
    ('P_PRATO','BRC0194F',true,0,10,80,250),
    ('P_PRATO','BRC0637F',false,1,10,80,250),
    ('P_PRATO','BRC0486E',false,2,10,80,300),
    ('P_PRATO','BRC0163F',false,3,10,70,220),
    ('P_PRATO','BRC0053N',false,4,10,60,220),
    ('LATICINIOS','BRC0023G',true,0,5,100,300),
    ('LATICINIOS','BRC0128G',false,1,5,100,350),
    ('LATICINIOS','BRC0158G',false,2,5,40,180),
    ('LATICINIOS','BRC0075N',false,3,5,40,180),
    ('LATICINIOS','BRC0036N',false,4,5,30,150),
    ('P_LANCHE','BRC0038G',true,0,5,10,60),
    ('P_LANCHE','BRC0158G',false,1,5,40,180),
    ('P_LANCHE','BRC0075N',false,2,5,40,180),
    ('P_LANCHE','BRC0053N',false,3,10,40,160),
    ('P_LANCHE','BRC0194F',false,4,10,50,180),
    ('C_PRATO','BRC0018A',true,0,5,50,300),
    ('C_PRATO','BRC0116A',false,1,5,50,300),
    ('C_PRATO','BRC0041B',false,2,10,100,500),
    ('C_PRATO','BRC0042B',false,3,10,80,400),
    ('C_PRATO','BRC0053B',false,4,10,60,300),
    ('C_PRATO','BRC0409A',false,5,5,50,300),
    ('LEGUMINOSAS','BRC0254T',true,0,5,50,160),
    ('LEGUMINOSAS','BRC0275T',false,1,5,30,140),
    ('LEGUMINOSAS','BRC0018T',false,2,5,50,180),
    ('LEGUMINOSAS','BRC0028T',false,3,5,50,180),
    ('LEGUMINOSAS','BRC0024T',false,4,5,50,180),
    ('GORDURAS','BRC0002D',true,0,1,3,20),
    ('GORDURAS','BRC0001C',false,1,5,25,180),
    ('GORDURAS','BRC0021T',false,2,5,5,50),
    ('GORDURAS','BRC0002U',false,3,5,5,50),
    ('GORDURAS','BRC0016U',false,4,5,5,40),
    ('GORDURAS','BRC0290T',false,5,5,5,50),
    ('VEG_A','BRC0063B',true,0,10,null,null),
    ('VEG_A','BRC0035B',false,1,10,null,null),
    ('VEG_A','BRC0030B',false,2,10,null,null),
    ('VEG_A','BRC0045B',false,3,10,null,null),
    ('VEG_A','BRC0156B',false,4,10,null,null),
    ('VEG_B','BRC0047B',true,0,10,50,200),
    ('VEG_B','BRC0044B',false,1,10,50,200),
    ('VEG_B','BRC0176A',false,2,10,30,150),
    ('VEG_B','BRC0024T',false,3,10,30,150),
    ('VEG_B','BRC0059B',false,4,10,50,250)
)
insert into public.grupo_substituicao_itens
(grupo_id,alimento_id,principal,ordem,arredondamento_g,porcao_min_g,porcao_max_g)
select g.id,a.id,d.principal,d.ordem,d.arredondamento_g,d.porcao_min_g,d.porcao_max_g
from dados d
join public.grupos_substituicao g on g.codigo=d.codigo and g.biblioteca='clinica_v1'
join public.alimentos a on a.origem_referencia=d.ref and a.biblioteca='clinica_v1';
