-- Ajusta a ordem das sugestões para os modelos com melhor faixa de escalabilidade.
with modelos(nome,ordem_nova) as (values
  ('B02 Bowl proteico',0),
  ('B01 Café tradicional',1),
  ('B03 Cuscuz com proteína',2),
  ('B05 Fruta, cottage e castanhas',0),
  ('B06 Mini sanduíche',1),
  ('B04 Iogurte, fruta e aveia',2),
  ('B07 Almoço brasileiro',0),
  ('B08 Almoço carne vermelha',1),
  ('B09 Almoço peixe e tubérculo',2),
  ('B10 Sanduíche completo',0),
  ('B11 Bowl proteico da tarde',1),
  ('B12 Cuscuz e ovos',2),
  ('B13 Jantar tradicional',0),
  ('B14 Jantar sanduíche',1),
  ('B15 Jantar peixe e batata-doce',2)
)
update public.protocolo_refeicoes_preferidas pref
set ordem=m.ordem_nova
from modelos m, public.refeicoes_modelo r
where pref.refeicao_modelo_id=r.id and r.nome=m.nome and r.biblioteca='clinica_v1';
