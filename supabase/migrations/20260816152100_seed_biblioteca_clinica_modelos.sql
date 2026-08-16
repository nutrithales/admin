create temporary table _modelos_clinicos(nome text, slot_nome text, preferencia integer) on commit drop;
insert into _modelos_clinicos values
    ('B01 Café tradicional','Café da manhã',0),
    ('B02 Bowl proteico','Café da manhã',1),
    ('B03 Cuscuz com proteína','Café da manhã',2),
    ('B04 Iogurte, fruta e aveia','Lanche da manhã',0),
    ('B05 Fruta, cottage e castanhas','Lanche da manhã',1),
    ('B06 Mini sanduíche','Lanche da manhã',2),
    ('B07 Almoço brasileiro','Almoço',0),
    ('B08 Almoço carne vermelha','Almoço',1),
    ('B09 Almoço peixe e tubérculo','Almoço',2),
    ('B10 Sanduíche completo','Lanche da tarde',0),
    ('B11 Bowl proteico da tarde','Lanche da tarde',1),
    ('B12 Cuscuz e ovos','Lanche da tarde',2),
    ('B13 Jantar tradicional','Jantar',0),
    ('B14 Jantar sanduíche','Jantar',1),
    ('B15 Jantar peixe e batata-doce','Jantar',2);

insert into public.refeicoes_modelo
(nome,tags,ativo,observacoes,biblioteca)
select nome, array['clinica_v1','matriz_b',lower(replace(slot_nome,' ','_'))], true,
       'Modelo clínico escalável. Vegetais Tipo A são livres; quantidades finais são revisadas pelo nutricionista.',
       'clinica_v1'
from _modelos_clinicos;

insert into public.refeicao_modelo_opcoes
(refeicao_modelo_id,nome,ordem,tags,observacoes)
select r.id,'Opção principal',0,array['clinica_v1','matriz_b'],
       'Opção principal usada na geração automática; substituições são vinculadas por grupo.'
from public.refeicoes_modelo r
where r.biblioteca='clinica_v1';

create temporary table _itens_modelo(
  modelo text, ref text, quantidade_g numeric, papel_macro text, grupo_codigo text,
  contabiliza boolean, quantidade_min_g numeric, quantidade_max_g numeric,
  arredondamento_g numeric, ordem integer
) on commit drop;
insert into _itens_modelo values
    ('B01 Café tradicional','BRC0149A',50,'carboidrato','C_CAFE',true,25,100,5,0),
    ('B01 Café tradicional','BRC0010J',100,'proteina','P_SALGADA',true,50,150,50,1),
    ('B01 Café tradicional','BRC0011C',80,'misto','FRUTAS',true,60,160,5,2),
    ('B02 Bowl proteico','BRC0023G',170,'misto','LATICINIOS',true,100,250,5,0),
    ('B02 Bowl proteico','BRC0038G',20,'proteina','P_LANCHE',true,10,50,5,1),
    ('B02 Bowl proteico','BRC0024A',30,'carboidrato','C_CAFE',true,10,60,5,2),
    ('B02 Bowl proteico','BRC0011C',80,'misto','FRUTAS',true,60,160,5,3),
    ('B02 Bowl proteico','BRC0290T',10,'gordura','GORDURAS',true,5,30,5,4),
    ('B03 Cuscuz com proteína','BRC0409A',100,'carboidrato','C_CAFE',true,50,180,5,0),
    ('B03 Cuscuz com proteína','BRC0194F',80,'proteina','P_SALGADA',true,50,150,10,1),
    ('B03 Cuscuz com proteína','BRC0044C',120,'misto','FRUTAS',true,80,250,5,2),
    ('B04 Iogurte, fruta e aveia','BRC0023G',170,'misto','LATICINIOS',true,100,250,5,0),
    ('B04 Iogurte, fruta e aveia','BRC0064C',100,'misto','FRUTAS',true,60,200,5,1),
    ('B04 Iogurte, fruta e aveia','BRC0024A',15,'carboidrato','C_CAFE',true,10,40,5,2),
    ('B04 Iogurte, fruta e aveia','BRC0038G',10,'proteina','P_LANCHE',true,10,30,5,3),
    ('B05 Fruta, cottage e castanhas','BRC0011C',80,'misto','FRUTAS',true,60,160,5,0),
    ('B05 Fruta, cottage e castanhas','BRC0158G',60,'proteina','P_SALGADA',true,40,120,5,1),
    ('B05 Fruta, cottage e castanhas','BRC0002U',10,'gordura','GORDURAS',true,5,30,5,2),
    ('B06 Mini sanduíche','BRC0149A',25,'carboidrato','C_CAFE',true,25,75,5,0),
    ('B06 Mini sanduíche','BRC0194F',60,'proteina','P_SALGADA',true,40,120,10,1),
    ('B06 Mini sanduíche','BRC0063B',50,'livre','VEG_A',false,null,null,10,2),
    ('B07 Almoço brasileiro','BRC0018A',140,'carboidrato','C_PRATO',true,70,250,5,0),
    ('B07 Almoço brasileiro','BRC0254T',80,'misto','LEGUMINOSAS',true,50,140,5,1),
    ('B07 Almoço brasileiro','BRC0194F',130,'proteina','P_PRATO',true,90,220,10,2),
    ('B07 Almoço brasileiro','BRC0047B',100,'vegetal_b','VEG_B',true,50,150,10,3),
    ('B07 Almoço brasileiro','BRC0063B',50,'livre','VEG_A',false,null,null,10,4),
    ('B07 Almoço brasileiro','BRC0002D',5,'gordura','GORDURAS',true,3,12,1,5),
    ('B08 Almoço carne vermelha','BRC0018A',140,'carboidrato','C_PRATO',true,70,250,5,0),
    ('B08 Almoço carne vermelha','BRC0018T',80,'misto','LEGUMINOSAS',true,50,140,5,1),
    ('B08 Almoço carne vermelha','BRC0637F',130,'proteina','P_PRATO',true,90,220,10,2),
    ('B08 Almoço carne vermelha','BRC0044B',100,'vegetal_b','VEG_B',true,50,150,10,3),
    ('B08 Almoço carne vermelha','BRC0035B',100,'livre','VEG_A',false,null,null,10,4),
    ('B08 Almoço carne vermelha','BRC0002D',5,'gordura','GORDURAS',true,3,12,1,5),
    ('B09 Almoço peixe e tubérculo','BRC0041B',220,'carboidrato','C_PRATO',true,120,400,10,0),
    ('B09 Almoço peixe e tubérculo','BRC0028T',80,'misto','LEGUMINOSAS',true,50,140,5,1),
    ('B09 Almoço peixe e tubérculo','BRC0486E',160,'proteina','P_PRATO',true,100,250,10,2),
    ('B09 Almoço peixe e tubérculo','BRC0176A',60,'vegetal_b','VEG_B',true,30,100,10,3),
    ('B09 Almoço peixe e tubérculo','BRC0045B',100,'livre','VEG_A',false,null,null,10,4),
    ('B09 Almoço peixe e tubérculo','BRC0002D',5,'gordura','GORDURAS',true,3,12,1,5),
    ('B10 Sanduíche completo','BRC0149A',50,'carboidrato','C_CAFE',true,25,100,5,0),
    ('B10 Sanduíche completo','BRC0194F',80,'proteina','P_SALGADA',true,50,150,10,1),
    ('B10 Sanduíche completo','BRC0064C',100,'misto','FRUTAS',true,60,200,5,2),
    ('B10 Sanduíche completo','BRC0063B',50,'livre','VEG_A',false,null,null,10,3),
    ('B11 Bowl proteico da tarde','BRC0023G',170,'misto','LATICINIOS',true,100,250,5,0),
    ('B11 Bowl proteico da tarde','BRC0038G',20,'proteina','P_LANCHE',true,10,50,5,1),
    ('B11 Bowl proteico da tarde','BRC0024A',25,'carboidrato','C_CAFE',true,10,60,5,2),
    ('B11 Bowl proteico da tarde','BRC0011C',80,'misto','FRUTAS',true,60,160,5,3),
    ('B11 Bowl proteico da tarde','BRC0290T',10,'gordura','GORDURAS',true,5,30,5,4),
    ('B12 Cuscuz e ovos','BRC0409A',100,'carboidrato','C_CAFE',true,50,180,5,0),
    ('B12 Cuscuz e ovos','BRC0010J',100,'proteina','P_SALGADA',true,50,150,50,1),
    ('B12 Cuscuz e ovos','BRC0044C',120,'misto','FRUTAS',true,80,250,5,2),
    ('B13 Jantar tradicional','BRC0018A',120,'carboidrato','C_PRATO',true,60,230,5,0),
    ('B13 Jantar tradicional','BRC0254T',80,'misto','LEGUMINOSAS',true,50,140,5,1),
    ('B13 Jantar tradicional','BRC0194F',130,'proteina','P_PRATO',true,90,220,10,2),
    ('B13 Jantar tradicional','BRC0047B',100,'vegetal_b','VEG_B',true,50,150,10,3),
    ('B13 Jantar tradicional','BRC0063B',50,'livre','VEG_A',false,null,null,10,4),
    ('B13 Jantar tradicional','BRC0002D',5,'gordura','GORDURAS',true,3,12,1,5),
    ('B14 Jantar sanduíche','BRC0149A',75,'carboidrato','C_CAFE',true,50,125,5,0),
    ('B14 Jantar sanduíche','BRC0637F',100,'proteina','P_SALGADA',true,70,180,10,1),
    ('B14 Jantar sanduíche','BRC0064C',100,'misto','FRUTAS',true,60,200,5,2),
    ('B14 Jantar sanduíche','BRC0035B',100,'livre','VEG_A',false,null,null,10,3),
    ('B14 Jantar sanduíche','BRC0001C',45,'gordura','GORDURAS',true,25,100,5,4),
    ('B15 Jantar peixe e batata-doce','BRC0042B',180,'carboidrato','C_PRATO',true,100,350,10,0),
    ('B15 Jantar peixe e batata-doce','BRC0486E',160,'proteina','P_PRATO',true,100,250,10,1),
    ('B15 Jantar peixe e batata-doce','BRC0059B',100,'vegetal_b','VEG_B',true,50,180,10,2),
    ('B15 Jantar peixe e batata-doce','BRC0045B',100,'livre','VEG_A',false,null,null,10,3),
    ('B15 Jantar peixe e batata-doce','BRC0002D',5,'gordura','GORDURAS',true,3,12,1,4);

insert into public.refeicao_modelo_opcao_itens
(opcao_id,alimento_id,quantidade_g,ordem,grupo_substituicao_id,papel_macro,
 contabiliza_macros,quantidade_min_g,quantidade_max_g,arredondamento_g)
select o.id,a.id,i.quantidade_g,i.ordem,g.id,i.papel_macro,
       i.contabiliza,i.quantidade_min_g,i.quantidade_max_g,i.arredondamento_g
from _itens_modelo i
join public.refeicoes_modelo r on r.nome=i.modelo and r.biblioteca='clinica_v1'
join public.refeicao_modelo_opcoes o on o.refeicao_modelo_id=r.id and o.ordem=0
join public.alimentos a on a.origem_referencia=i.ref and a.biblioteca='clinica_v1'
join public.grupos_substituicao g on g.codigo=i.grupo_codigo and g.biblioteca='clinica_v1';

insert into public.protocolo_refeicoes_preferidas
(protocolo_refeicao_id,refeicao_modelo_id,ordem)
select pr.id,r.id,m.preferencia
from _modelos_clinicos m
join public.refeicoes_modelo r on r.nome=m.nome and r.biblioteca='clinica_v1'
join public.protocolos p on p.nome='Matriz NTR — B — 5 refeições' and p.ativo=true
join public.protocolo_refeicoes pr on pr.protocolo_id=p.id and pr.nome=m.slot_nome;
