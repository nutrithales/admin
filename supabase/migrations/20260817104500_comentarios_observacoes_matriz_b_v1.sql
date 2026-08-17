-- Comentários clínicos/paciente para as 15 refeições-modelo da Matriz B
update public.refeicoes_modelo set observacoes = case nome
  when 'B01 Café tradicional' then 'Monte a refeição com o pão e os ovos nas quantidades indicadas. O pão pode ser consumido frio ou aquecido; os ovos podem ser cozidos, mexidos ou em omelete, evitando acrescentar óleo além do planejado. A fruta pode ser consumida junto ou separadamente.'
  when 'B02 Bowl proteico' then 'Misture o iogurte com a fonte proteica e a aveia. A fruta pode ser picada no bowl e a pasta de amendoim usada como cobertura. Se preferir uma consistência mais líquida, acrescente um pouco de água sem alterar as quantidades dos alimentos.'
  when 'B03 Cuscuz com proteína' then 'Prepare o cuscuz apenas com água e sal. A proteína pode ser servida como recheio ou acompanhamento. Consuma a fruta junto da refeição ou logo após, conforme sua rotina.'
  when 'B04 Iogurte, fruta e aveia' then 'Opção prática para levar. Misture o iogurte, a aveia e a fonte proteica; a fruta pode ser consumida inteira ou picada. Se preparar com antecedência, mantenha refrigerado até o consumo.'
  when 'B05 Fruta, cottage e castanhas' then 'Consuma a fruta com o cottage e as castanhas na quantidade indicada. É uma opção simples para dias corridos e pode ser levada em pote térmico quando necessário.'
  when 'B06 Mini sanduíche' then 'Monte o sanduíche com a proteína indicada e acrescente vegetais Tipo A à vontade. Pode deixar o recheio preparado com antecedência para facilitar a rotina.'
  when 'B07 Almoço brasileiro' then 'Considere os pesos dos alimentos já prontos para consumo. Monte o prato com arroz, feijão e proteína nas quantidades indicadas. Vegetais Tipo A são livres e podem ocupar boa parte do prato. Use o azeite após o preparo, na quantidade prescrita.'
  when 'B08 Almoço carne vermelha' then 'Considere os pesos dos alimentos já prontos para consumo. Prefira cortes magros e preparações grelhadas, assadas ou refogadas com pouca gordura adicional. Vegetais Tipo A são livres; o azeite deve respeitar a quantidade prescrita.'
  when 'B09 Almoço peixe e tubérculo' then 'Considere os pesos dos alimentos já prontos para consumo. O peixe pode ser grelhado, assado ou preparado na airfryer. Vegetais Tipo A são livres e o azeite deve ser acrescentado após o preparo, respeitando a quantidade do plano.'
  when 'B10 Sanduíche completo' then 'Monte o sanduíche com a proteína indicada e acrescente vegetais Tipo A à vontade. A fruta pode ser consumida como sobremesa ou separadamente. É uma boa opção para deixar o recheio pronto e montar na hora.'
  when 'B11 Bowl proteico da tarde' then 'Misture o iogurte, a fonte proteica e a aveia. Acrescente a fruta e finalize com a pasta de amendoim. Pode ser preparado pouco antes do consumo ou mantido refrigerado por algumas horas.'
  when 'B12 Cuscuz e ovos' then 'Prepare o cuscuz apenas com água e sal. Os ovos podem ser cozidos, mexidos ou em omelete, sem acrescentar gordura além da prevista. A fruta pode ser consumida junto ou logo após.'
  when 'B13 Jantar tradicional' then 'Considere os pesos dos alimentos já prontos para consumo. O jantar pode seguir a mesma lógica do almoço, mantendo as quantidades desta refeição. Vegetais Tipo A são livres e o azeite deve ser usado na quantidade indicada.'
  when 'B14 Jantar sanduíche' then 'Monte o sanduíche com a proteína indicada, vegetais Tipo A à vontade e a fonte de gordura prevista. A fruta pode ser consumida como acompanhamento ou sobremesa. Evite adicionar molhos calóricos não previstos no plano.'
  when 'B15 Jantar peixe e batata-doce' then 'Considere os pesos dos alimentos já prontos para consumo. O peixe pode ser grelhado, assado ou preparado na airfryer. Vegetais Tipo A são livres; mantenha o azeite e os demais acompanhamentos nas quantidades indicadas.'
  else observacoes
end
where biblioteca='clinica_v1' and nome like 'B%';

create or replace function public.adicionar_observacao_modelo_clinico_v1()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_modelo_observacao text;
begin
  select rm.observacoes into v_modelo_observacao
  from public.planos_estruturados pe
  join public.protocolo_refeicoes pr on pr.protocolo_id = pe.protocolo_id and pr.nome = new.nome
  join public.protocolo_refeicoes_preferidas pref on pref.protocolo_refeicao_id = pr.id
  join public.refeicoes_modelo rm on rm.id = pref.refeicao_modelo_id and rm.biblioteca = 'clinica_v1' and rm.ativo = true
  where pe.id = new.plano_estruturado_id
  order by pref.ordem
  limit 1;

  if nullif(trim(coalesce(v_modelo_observacao,'')), '') is not null then
    update public.plano_refeicoes
       set observacoes = trim(both from concat_ws(E'\n\n', v_modelo_observacao, nullif(observacoes,'')))
     where id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_a_observacao_modelo_clinico_v1 on public.plano_refeicoes;
create trigger trg_a_observacao_modelo_clinico_v1
after insert on public.plano_refeicoes
for each row execute function public.adicionar_observacao_modelo_clinico_v1();

revoke all on function public.adicionar_observacao_modelo_clinico_v1() from public;
revoke all on function public.adicionar_observacao_modelo_clinico_v1() from anon;
revoke all on function public.adicionar_observacao_modelo_clinico_v1() from authenticated;
