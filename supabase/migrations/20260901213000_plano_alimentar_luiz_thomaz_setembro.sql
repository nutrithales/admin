-- Plano alimentar individualizado - Luiz Felipe Thomaz Moreira - Setembro/2026.
-- Mantem a base do plano anterior, ajusta somente quantidades e inclui
-- Mac Proteina Mexidona e overnight oats. Dados do produto conforme rotulo.

begin;

insert into public.alimentos (
  id, nome, origem, origem_referencia, kcal_100g, proteina_100g,
  carboidrato_100g, gordura_100g, porcao_padrao_g, categoria,
  grupo_alimentar, unidade_padrao, medidas_caseiras, tags_restricao,
  alergenos, sinonimos, revisado_manualmente, ativo, biblioteca
)
select
  '43c87553-2b35-4b88-9e62-e02403d99c26'::uuid,
  'Mac Proteina Mexidona', 'Rotulo do fabricante', 'MEXIDONA_MAC_PROTEINA_100G',
  358, 23, 63, 1.2, 100, 'refeicao_pratica', 'misto', 'g',
  '[{"unidade":"Pacote","peso_g":100}]'::jsonb,
  array['sem_gluten','sem_lactose']::text[],
  array['aveia','pode conter ovos, amendoim, soja e castanhas']::text[],
  array['Mac Proteina','Mac Tomate Mexidona']::text[], true, true, 'clinica_v1'
where not exists (
  select 1 from public.alimentos where origem_referencia='MEXIDONA_MAC_PROTEINA_100G'
);

-- Medidas caseiras dos itens usados neste plano. Gramas continuam sendo a
-- referencia principal; a medida caseira aparece como apoio na area do paciente.
update public.alimentos set medidas_caseiras='[{"unidade":"Xicara de cafe","peso_g":80}]'::jsonb
where id='93498fa9-db03-432f-b597-0a9abdef659c';
update public.alimentos set medidas_caseiras='[{"unidade":"Fatia","peso_g":25}]'::jsonb
where id in ('70d07486-976a-491d-8887-a12f0a2260e3','59f2d808-f9ce-4d6c-b38c-26525bdf17b3');
update public.alimentos set medidas_caseiras='[{"unidade":"Unidade","peso_g":50}]'::jsonb
where id='5893684a-aab2-4aac-88ab-32b4e59b8c5f';
update public.alimentos set medidas_caseiras='[{"unidade":"Pote","peso_g":100}]'::jsonb
where id='962208b6-9666-4a4c-a77a-c03f60aebafe';
update public.alimentos set medidas_caseiras='[{"unidade":"Dosador","peso_g":30}]'::jsonb
where id='9f5e5d29-4180-4d01-90aa-08a3bbec20a7';
update public.alimentos set medidas_caseiras='[{"unidade":"Copo","peso_g":200}]'::jsonb
where id='19b9cfb3-c771-4112-b5db-9546617bcea5';
update public.alimentos set medidas_caseiras='[{"unidade":"Pote","peso_g":170}]'::jsonb
where id='d71e88b3-a73b-43f6-88b8-a7c63d6a666b';
update public.alimentos set medidas_caseiras='[{"unidade":"Colher de cha","peso_g":5}]'::jsonb
where id='a8e5814b-5602-4e91-a37d-2298f44ded04';
update public.alimentos set medidas_caseiras='[{"unidade":"Colher de cha","peso_g":5}]'::jsonb
where id='ad469743-bb10-420c-b2ee-455f3cffd07e';
update public.alimentos set medidas_caseiras='[{"unidade":"Unidade media","peso_g":70}]'::jsonb
where id='9801950d-aef8-44dd-bfb6-ac468d3ec551';
update public.alimentos set medidas_caseiras='[{"unidade":"Fatia media","peso_g":30}]'::jsonb
where id='dc3e5e09-9b25-433b-8d3e-cb9c45843dac';
update public.alimentos
set medidas_caseiras='[{"unidade":"Unidade pequena","peso_g":300},{"unidade":"1/2 mamao papaia pequeno","peso_g":150},{"unidade":"Xicara picado","peso_g":140}]'::jsonb
where id='8e0b3aaa-88cb-47ac-a995-81f6a981ce8c';

insert into public.planos_estruturados (
  id, auth_id, protocolo_id, titulo, meta_kcal, meta_proteina_g,
  meta_carboidrato_g, meta_gordura_g, status, gerado_por_ia, observacoes
)
select
  '138b20a2-e77b-43ec-b94c-c5c187b823d2'::uuid,
  p.auth_id,
  '88f9fb5b-8ae5-4e2c-8f6b-ef6c7a40d34a'::uuid,
  'Plano alimentar - Setembro/2026', 2060, 160, 260, 50,
  'finalizado', false,
  E'Objetivo deste ciclo: dar continuidade a recomposicao corporal observada na avaliacao, preservando a base alimentar que ja faz parte da rotina.\n\nAs quantidades estao descritas com o alimento pronto para consumo, salvo quando a embalagem indicar o contrario. Escolha apenas uma opcao em cada refeicao. As trocas da lista devem respeitar as porcoes indicadas.\n\nA ceia e opcional e deve ser usada somente quando houver fome real apos o jantar.\n\nVegetais Tipo A sao livres dentro de um volume confortavel. Para Vegetais Tipo B, escolha uma porcao da lista. Se houver aumento de gases ou distensao, priorize os vegetais cozidos mais bem tolerados e sinalize no acompanhamento.'
from public.pacientes p
where p.auth_id='b09d3cec-b34c-4ade-b4b6-0d50fbb8d3ff'
  and not exists (
    select 1 from public.planos_estruturados pe
    where pe.id='138b20a2-e77b-43ec-b94c-c5c187b823d2'
  );

update public.planos_estruturados
set meta_kcal=2060, meta_proteina_g=160, meta_carboidrato_g=260,
    meta_gordura_g=50, status='finalizado',
    observacoes=replace(observacoes,E'Nos dias sem treino, nao e necessario realizar o pre-treino. ',''),
    updated_at=now()
where id='138b20a2-e77b-43ec-b94c-c5c187b823d2';

-- Os IDs fixos tornam a carga rastreavel e segura contra duplicacao.
insert into public.plano_refeicoes (
  id, plano_estruturado_id, nome, ordem, meta_kcal, meta_proteina_g,
  meta_carboidrato_g, meta_gordura_g, observacoes, observacoes_opcoes
)
values
('ba47db25-875f-4c6e-ad1d-fc75650fc06f','138b20a2-e77b-43ec-b94c-c5c187b823d2','Cafe da manha',0,620,33,74,21,
 E'A proteina continua sendo a ancora da primeira refeicao. Como o pre-treino foi retirado, o cafe da manha recebeu maior quantidade de fruta, pao e ovos para manter a oferta energetica diaria. Varie a fruta usando a lista de substituicoes e observe a tolerancia intestinal.',
 '{"1":"Prepare os ovos cozidos, mexidos ou em omelete, sem acrescentar oleo em excesso. Em uma manha corrida, priorize ovos, iogurte e pao; a fruta pode ser consumida logo depois."}'::jsonb),
('8c39331c-3d76-43e2-91df-da954a53982e','138b20a2-e77b-43ec-b94c-c5c187b823d2','Almoco',1,600,50,62,15,
 E'Mantenha a proteina como prioridade do prato. No hospital, se a porcao servida vier pequena, complete com atum, ovos cozidos ou frango levado de casa. Use a opcao para intestino sensivel nos dias de maior distensao ou gases.',
 '{"1":"Considere os pesos com os alimentos prontos. Use o azeite depois do preparo. Deixe arroz, feijao e proteina porcionados sempre que possivel.","2":"Nos dias de intestino sensivel, prefira legumes cozidos e os tuberculos indicados. Evite molhos pesados e observe a resposta nas horas seguintes."}'::jsonb),
('d026dc57-c4c2-4556-9bb2-4560bd036444','138b20a2-e77b-43ec-b94c-c5c187b823d2','Lanche da tarde',2,380,27,48,8,
 E'Escolha uma opcao conforme a rotina. As opcoes com mingau, overnight oats e Mac Proteina funcionam bem nos dias de treino por oferecerem mais carboidrato. Mantenha refrigerados os alimentos que precisam de frio.',
 '{"1":"Para o mingau, misture a aveia ao leite quente, espere amornar e acrescente o whey. O calor nao reduz a proteina, mas pode alterar a textura.","2":"Monte o sanduiche com antecedencia e mantenha refrigerado. Leve a fruta separada para facilitar o transporte.","3":"A receita rende quatro bolinhos. Nesta opcao, consuma dois bolinhos para que o lanche fique equivalente aos demais.","4":"Prepare um pacote inteiro conforme a embalagem. Nao e necessario acrescentar whey, ovos ou queijo.","5":"Misture os ingredientes em um pote com tampa e deixe refrigerado por pelo menos quatro horas, preferencialmente durante a noite. Se ficar espesso, acrescente um pouco de agua."}'::jsonb),
('c402218e-1810-4726-9425-edaf0b43e8fd','138b20a2-e77b-43ec-b94c-c5c187b823d2','Jantar',3,430,40,45,10,
 E'O jantar deve ser leve, mas nao fraco. Mantenha uma fonte proteica e escolha os vegetais conforme tolerancia. Nos dias de treino, preserve a porcao de carboidrato para apoiar a recuperacao.',
 '{"1":"Organize proteina e carboidrato ja prontos e porcionados. Prefira vegetais cozidos se folhas cruas aumentarem a distensao a noite.","2":"Prepare o pacote inteiro do Mac Proteina e acrescente o frango e os vegetais indicados. Nao adicione azeite, creme, requeijao ou grandes quantidades de queijo.","3":"Monte o sanduiche com o frango ja preparado. Acrescente tomate e folhas apenas na hora para o pao nao ficar umido.","4":"Monte como pizza e leve ao forno ou airfryer por 8 a 10 minutos, ate o queijo derreter e as bordas ficarem levemente crocantes."}'::jsonb),
('c7d9d353-94b3-4f50-ae74-c86a28d3ff31','138b20a2-e77b-43ec-b94c-c5c187b823d2','Ceia',4,70,2,15,1,
 E'A ceia e opcional. Utilize apenas se houver fome real depois do jantar. Escolha uma unica porcao de fruta e, se desejar, associe a um cha sem acucar. Se acordar estufado, reduza o volume ou mantenha a ceia suspensa.',
 '{"1":"Consuma uma porcao simples, sem misturar varias frutas.","2":"Opcao de maior volume e baixa densidade energetica.","3":"Pode ser combinada com cha de cidreira ou erva-doce sem acucar."}'::jsonb)
on conflict (id) do nothing;

delete from public.plano_refeicoes
where id='84104c1e-5042-4356-8cd4-cdd113127f8f'
  and plano_estruturado_id='138b20a2-e77b-43ec-b94c-c5c187b823d2';

update public.plano_refeicoes set ordem=3 where id='c402218e-1810-4726-9425-edaf0b43e8fd';
update public.plano_refeicoes set ordem=4 where id='c7d9d353-94b3-4f50-ae74-c86a28d3ff31';
update public.plano_refeicoes
set meta_kcal=620, meta_proteina_g=33, meta_carboidrato_g=74, meta_gordura_g=21,
    observacoes=E'A proteina continua sendo a ancora da primeira refeicao. Como o pre-treino foi retirado, o cafe da manha recebeu maior quantidade de fruta, pao e ovos para manter a oferta energetica diaria. Varie a fruta usando a lista de substituicoes e observe a tolerancia intestinal.'
where id='ba47db25-875f-4c6e-ad1d-fc75650fc06f';

-- Os gatilhos das matrizes preenchem opcoes genericas ao criar os slots.
-- Neste plano individual, removemos apenas esse rascunho automatico para
-- gravar abaixo as opcoes prescritas para o Luiz.
delete from public.plano_refeicao_itens
where plano_refeicao_id in (
  select id from public.plano_refeicoes
  where plano_estruturado_id='138b20a2-e77b-43ec-b94c-c5c187b823d2'
);

-- Itens: alimento, quantidade em gramas, opcao, nome e grupo de substituicao.
with itens(refeicao_id,opcao,opcao_nome,ordem,alimento_id,quantidade_g,grupo_codigo,papel_macro,contabiliza) as (values
  -- Cafe da manha
  ('ba47db25-875f-4c6e-ad1d-fc75650fc06f'::uuid,1,'Cafe da manha habitual',0,'93498fa9-db03-432f-b597-0a9abdef659c'::uuid,80::numeric,null,null,true),
  ('ba47db25-875f-4c6e-ad1d-fc75650fc06f',1,'Cafe da manha habitual',1,'8e0b3aaa-88cb-47ac-a995-81f6a981ce8c',300,'FRUTAS','carboidrato',true),
  ('ba47db25-875f-4c6e-ad1d-fc75650fc06f',1,'Cafe da manha habitual',2,'59f2d808-f9ce-4d6c-b38c-26525bdf17b3',75,'C_CAFE','carboidrato',true),
  ('ba47db25-875f-4c6e-ad1d-fc75650fc06f',1,'Cafe da manha habitual',3,'5893684a-aab2-4aac-88ab-32b4e59b8c5f',150,'P_SALGADA','proteina',true),
  ('ba47db25-875f-4c6e-ad1d-fc75650fc06f',1,'Cafe da manha habitual',4,'962208b6-9666-4a4c-a77a-c03f60aebafe',100,'LATICINIOS','proteina',true),

  -- Almoco 1
  ('8c39331c-3d76-43e2-91df-da954a53982e',1,'Prato com arroz e feijao',0,'4882bb92-eff2-4cf3-9a2f-5892763bb1c0',50,'VEG_A','livre',false),
  ('8c39331c-3d76-43e2-91df-da954a53982e',1,'Prato com arroz e feijao',1,'b5579d11-f305-4cfe-ace5-7742cd93e843',100,'VEG_B','vegetal_b',true),
  ('8c39331c-3d76-43e2-91df-da954a53982e',1,'Prato com arroz e feijao',2,'77a93e52-b6b8-4838-a585-d87908647ef1',130,'P_PRATO','proteina',true),
  ('8c39331c-3d76-43e2-91df-da954a53982e',1,'Prato com arroz e feijao',3,'d14ab143-5770-4a5b-9505-3ddb77381298',120,'C_PRATO','carboidrato',true),
  ('8c39331c-3d76-43e2-91df-da954a53982e',1,'Prato com arroz e feijao',4,'ea9d71fe-d658-41d8-80d3-e007690a5024',100,'LEGUMINOSAS','carboidrato',true),
  ('8c39331c-3d76-43e2-91df-da954a53982e',1,'Prato com arroz e feijao',5,'b388b53b-7fc1-481a-b557-a93d5467bf7f',5,'GORDURAS','gordura',true),
  -- Almoco 2
  ('8c39331c-3d76-43e2-91df-da954a53982e',2,'Dias com intestino sensivel',0,'4882bb92-eff2-4cf3-9a2f-5892763bb1c0',50,'VEG_A','livre',false),
  ('8c39331c-3d76-43e2-91df-da954a53982e',2,'Dias com intestino sensivel',1,'b5579d11-f305-4cfe-ace5-7742cd93e843',100,'VEG_B','vegetal_b',true),
  ('8c39331c-3d76-43e2-91df-da954a53982e',2,'Dias com intestino sensivel',2,'77a93e52-b6b8-4838-a585-d87908647ef1',150,'P_PRATO','proteina',true),
  ('8c39331c-3d76-43e2-91df-da954a53982e',2,'Dias com intestino sensivel',3,'d14ab143-5770-4a5b-9505-3ddb77381298',150,'C_PRATO','carboidrato',true),
  ('8c39331c-3d76-43e2-91df-da954a53982e',2,'Dias com intestino sensivel',4,'4ac72052-5452-41b4-813f-b4fea5d0d9a3',120,'C_PRATO','carboidrato',true),
  ('8c39331c-3d76-43e2-91df-da954a53982e',2,'Dias com intestino sensivel',5,'b388b53b-7fc1-481a-b557-a93d5467bf7f',5,'GORDURAS','gordura',true),

  -- Lanche 1 - mingau
  ('d026dc57-c4c2-4556-9bb2-4560bd036444',1,'Mingau com whey e fruta',0,'cc970a23-7a76-4db4-af1d-be9433f8723d',25,'C_CAFE','carboidrato',true),
  ('d026dc57-c4c2-4556-9bb2-4560bd036444',1,'Mingau com whey e fruta',1,'9f5e5d29-4180-4d01-90aa-08a3bbec20a7',20,null,'proteina',true),
  ('d026dc57-c4c2-4556-9bb2-4560bd036444',1,'Mingau com whey e fruta',2,'19b9cfb3-c771-4112-b5db-9546617bcea5',200,'LATICINIOS','proteina',true),
  ('d026dc57-c4c2-4556-9bb2-4560bd036444',1,'Mingau com whey e fruta',3,'7f5e6c8e-52dd-4272-8b4e-fdc31d6c798b',80,'FRUTAS','carboidrato',true),
  -- Lanche 2 - sanduiche
  ('d026dc57-c4c2-4556-9bb2-4560bd036444',2,'Sanduiche com ovos',0,'5893684a-aab2-4aac-88ab-32b4e59b8c5f',100,'P_SALGADA','proteina',true),
  ('d026dc57-c4c2-4556-9bb2-4560bd036444',2,'Sanduiche com ovos',1,'70d07486-976a-491d-8887-a12f0a2260e3',50,'C_CAFE','carboidrato',true),
  ('d026dc57-c4c2-4556-9bb2-4560bd036444',2,'Sanduiche com ovos',2,'9bc7dbbd-cd51-4c6e-87f0-335d09afb09b',30,'LATICINIOS','gordura',true),
  ('d026dc57-c4c2-4556-9bb2-4560bd036444',2,'Sanduiche com ovos',3,'7f5e6c8e-52dd-4272-8b4e-fdc31d6c798b',80,'FRUTAS','carboidrato',true),
  -- Lanche 3 - dois bolinhos (metade da receita original)
  ('d026dc57-c4c2-4556-9bb2-4560bd036444',3,'Dois bolinhos de banana, whey e aveia',0,'7f5e6c8e-52dd-4272-8b4e-fdc31d6c798b',98,'FRUTAS','carboidrato',true),
  ('d026dc57-c4c2-4556-9bb2-4560bd036444',3,'Dois bolinhos de banana, whey e aveia',1,'cc970a23-7a76-4db4-af1d-be9433f8723d',30,'C_CAFE','carboidrato',true),
  ('d026dc57-c4c2-4556-9bb2-4560bd036444',3,'Dois bolinhos de banana, whey e aveia',2,'9f5e5d29-4180-4d01-90aa-08a3bbec20a7',28,null,'proteina',true),
  ('d026dc57-c4c2-4556-9bb2-4560bd036444',3,'Dois bolinhos de banana, whey e aveia',3,'5893684a-aab2-4aac-88ab-32b4e59b8c5f',50,'P_SALGADA','proteina',true),
  -- Lanche 4 - Mac Proteina
  ('d026dc57-c4c2-4556-9bb2-4560bd036444',4,'Mac Proteina Mexidona',0,'43c87553-2b35-4b88-9e62-e02403d99c26',100,null,'misto',true),
  -- Lanche 5 - overnight oats
  ('d026dc57-c4c2-4556-9bb2-4560bd036444',5,'Overnight oats',0,'d71e88b3-a73b-43f6-88b8-a7c63d6a666b',170,'LATICINIOS','proteina',true),
  ('d026dc57-c4c2-4556-9bb2-4560bd036444',5,'Overnight oats',1,'cc970a23-7a76-4db4-af1d-be9433f8723d',30,'C_CAFE','carboidrato',true),
  ('d026dc57-c4c2-4556-9bb2-4560bd036444',5,'Overnight oats',2,'9f5e5d29-4180-4d01-90aa-08a3bbec20a7',20,null,'proteina',true),
  ('d026dc57-c4c2-4556-9bb2-4560bd036444',5,'Overnight oats',3,'7f5e6c8e-52dd-4272-8b4e-fdc31d6c798b',60,'FRUTAS','carboidrato',true),
  ('d026dc57-c4c2-4556-9bb2-4560bd036444',5,'Overnight oats',4,'a8e5814b-5602-4e91-a37d-2298f44ded04',5,'GORDURAS','gordura',true),

  -- Jantar 1
  ('c402218e-1810-4726-9425-edaf0b43e8fd',1,'Prato leve com arroz',0,'4882bb92-eff2-4cf3-9a2f-5892763bb1c0',50,'VEG_A','livre',false),
  ('c402218e-1810-4726-9425-edaf0b43e8fd',1,'Prato leve com arroz',1,'b5579d11-f305-4cfe-ace5-7742cd93e843',100,'VEG_B','vegetal_b',true),
  ('c402218e-1810-4726-9425-edaf0b43e8fd',1,'Prato leve com arroz',2,'77a93e52-b6b8-4838-a585-d87908647ef1',130,'P_PRATO','proteina',true),
  ('c402218e-1810-4726-9425-edaf0b43e8fd',1,'Prato leve com arroz',3,'d14ab143-5770-4a5b-9505-3ddb77381298',150,'C_PRATO','carboidrato',true),
  ('c402218e-1810-4726-9425-edaf0b43e8fd',1,'Prato leve com arroz',4,'b388b53b-7fc1-481a-b557-a93d5467bf7f',5,'GORDURAS','gordura',true),
  -- Jantar 2 - Mac Proteina
  ('c402218e-1810-4726-9425-edaf0b43e8fd',2,'Mac Proteina com frango e vegetais',0,'43c87553-2b35-4b88-9e62-e02403d99c26',100,null,'misto',true),
  ('c402218e-1810-4726-9425-edaf0b43e8fd',2,'Mac Proteina com frango e vegetais',1,'77a93e52-b6b8-4838-a585-d87908647ef1',60,'P_PRATO','proteina',true),
  ('c402218e-1810-4726-9425-edaf0b43e8fd',2,'Mac Proteina com frango e vegetais',2,'4882bb92-eff2-4cf3-9a2f-5892763bb1c0',50,'VEG_A','livre',false),
  ('c402218e-1810-4726-9425-edaf0b43e8fd',2,'Mac Proteina com frango e vegetais',3,'b5579d11-f305-4cfe-ace5-7742cd93e843',100,'VEG_B','vegetal_b',true),
  -- Jantar 3 - sanduiche
  ('c402218e-1810-4726-9425-edaf0b43e8fd',3,'Sanduiche proteico',0,'70d07486-976a-491d-8887-a12f0a2260e3',50,'C_CAFE','carboidrato',true),
  ('c402218e-1810-4726-9425-edaf0b43e8fd',3,'Sanduiche proteico',1,'77a93e52-b6b8-4838-a585-d87908647ef1',100,'P_PRATO','proteina',true),
  ('c402218e-1810-4726-9425-edaf0b43e8fd',3,'Sanduiche proteico',2,'dfd3c7fc-53ef-4d43-937d-485808a50f0a',40,'LATICINIOS','proteina',true),
  ('c402218e-1810-4726-9425-edaf0b43e8fd',3,'Sanduiche proteico',3,'c9308528-876b-4584-a0e8-eb1fcf7ba362',100,'C_PRATO','carboidrato',true),
  ('c402218e-1810-4726-9425-edaf0b43e8fd',3,'Sanduiche proteico',4,'4882bb92-eff2-4cf3-9a2f-5892763bb1c0',50,'VEG_A','livre',false),
  -- Jantar 4 - pizza no pao sirio; ricota preserva equivalencia sem criar produto de marca
  ('c402218e-1810-4726-9425-edaf0b43e8fd',4,'Pizza no pao sirio',0,'9801950d-aef8-44dd-bfb6-ac468d3ec551',70,'C_CAFE','carboidrato',true),
  ('c402218e-1810-4726-9425-edaf0b43e8fd',4,'Pizza no pao sirio',1,'90991489-485d-47ed-9d67-22b4d970dc0b',130,'P_PRATO','proteina',true),
  ('c402218e-1810-4726-9425-edaf0b43e8fd',4,'Pizza no pao sirio',2,'dc3e5e09-9b25-433b-8d3e-cb9c45843dac',30,'LATICINIOS','proteina',true),
  ('c402218e-1810-4726-9425-edaf0b43e8fd',4,'Pizza no pao sirio',3,'4e43540d-84a5-456e-9112-b70914252d58',100,'VEG_A','livre',false),

  -- Ceia
  ('c7d9d353-94b3-4f50-ae74-c86a28d3ff31',1,'Manga',0,'4841a2a5-a894-41b8-921b-f3546ab37bea',70,'FRUTAS','carboidrato',true),
  ('c7d9d353-94b3-4f50-ae74-c86a28d3ff31',2,'Melancia',0,'7cd0a4af-7393-4ce3-92dc-2c85eaf0109d',200,'FRUTAS','carboidrato',true),
  ('c7d9d353-94b3-4f50-ae74-c86a28d3ff31',3,'Morangos',0,'0df5e758-1c12-4ffd-8f49-dc8954d03958',200,'FRUTAS','carboidrato',true)
)
insert into public.plano_refeicao_itens (
  plano_refeicao_id, alimento_id, quantidade_g, ordem,
  grupo_substituicao_id, papel_macro, contabiliza_macros,
  opcao_numero, opcao_nome
)
select
  i.refeicao_id, i.alimento_id, i.quantidade_g, i.ordem,
  g.id, i.papel_macro, i.contabiliza, i.opcao, i.opcao_nome
from itens i
left join public.grupos_substituicao g
  on g.codigo=i.grupo_codigo and g.biblioteca='clinica_v1' and g.ativo=true
where not exists (
  select 1 from public.plano_refeicao_itens pri
  where pri.plano_refeicao_id=i.refeicao_id
);

-- O gatilho geral das matrizes inclui Vegetais Tipo A em todos os slots.
-- Eles nao fazem parte do cafe da manha deste plano individual.
delete from public.plano_refeicao_itens
where plano_refeicao_id='ba47db25-875f-4c6e-ad1d-fc75650fc06f'
  and papel_macro='livre';

commit;
