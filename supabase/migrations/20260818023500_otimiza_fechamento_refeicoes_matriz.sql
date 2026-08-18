-- Otimização clínica do preenchimento automático das matrizes.
-- Prioridade: kcal em faixa de +/-5%, depois macros; pré-treino prioriza carboidrato e baixo excesso de gordura.
-- Pré-treino de Performance passa a 10% do VET e permanece adicional ao número de refeições da matriz.

update public.protocolo_refeicoes pr
set percentual_kcal = x.percentual
from public.protocolos p
join (values
  ('Matriz NTR - Performance A - 4 refeições','Café da manhã',22.5::numeric),
  ('Matriz NTR - Performance A - 4 refeições','Almoço',31.5::numeric),
  ('Matriz NTR - Performance A - 4 refeições','Pré-treino',10::numeric),
  ('Matriz NTR - Performance A - 4 refeições','Lanche da tarde',13.5::numeric),
  ('Matriz NTR - Performance A - 4 refeições','Jantar',22.5::numeric),
  ('Matriz NTR - Performance B - 5 refeições','Café da manhã',18::numeric),
  ('Matriz NTR - Performance B - 5 refeições','Lanche da manhã',9::numeric),
  ('Matriz NTR - Performance B - 5 refeições','Almoço',27::numeric),
  ('Matriz NTR - Performance B - 5 refeições','Pré-treino',10::numeric),
  ('Matriz NTR - Performance B - 5 refeições','Lanche da tarde',13.5::numeric),
  ('Matriz NTR - Performance B - 5 refeições','Jantar',22.5::numeric),
  ('Matriz NTR - Performance C - 6 refeições','Café da manhã',18::numeric),
  ('Matriz NTR - Performance C - 6 refeições','Lanche da manhã',9::numeric),
  ('Matriz NTR - Performance C - 6 refeições','Almoço',27::numeric),
  ('Matriz NTR - Performance C - 6 refeições','Pré-treino',10::numeric),
  ('Matriz NTR - Performance C - 6 refeições','Lanche da tarde',13.5::numeric),
  ('Matriz NTR - Performance C - 6 refeições','Jantar',18::numeric),
  ('Matriz NTR - Performance C - 6 refeições','Ceia',4.5::numeric)
) as x(protocolo_nome,refeicao_nome,percentual) on x.protocolo_nome=p.nome
where pr.protocolo_id=p.id and pr.nome=x.refeicao_nome;

update public.refeicao_modelo_opcao_itens i
set quantidade_max_g = case r.nome
  when 'B07 Prato com feijão' then 200
  when 'B08 Prato sem feijão' then 240
  when 'B13 Prato com feijão' then 200
  when 'B15 Prato sem feijão' then 220
  else i.quantidade_max_g end
from public.refeicao_modelo_opcoes o, public.refeicoes_modelo r, public.alimentos a
where i.opcao_id=o.id and o.refeicao_modelo_id=r.id and a.id=i.alimento_id
  and r.nome in ('B07 Prato com feijão','B08 Prato sem feijão','B13 Prato com feijão','B15 Prato sem feijão')
  and i.papel_macro='carboidrato' and a.nome ilike 'Arroz branco%';

create or replace function public.preencher_opcoes_refeicao_matriz(
  p_refeicao_id uuid,
  p_somente_alternativas boolean default false
)
returns void
language plpgsql
security definer
set search_path=public
as $$
declare
  v_ref record; v_pref record; v_opcao_id uuid; v_numero integer; v_nome_opcao text;
  v_fp numeric; v_fc numeric; v_fg numeric; v_pre_treino boolean;
begin
  select prf.*,pe.protocolo_id into v_ref
  from public.plano_refeicoes prf join public.planos_estruturados pe on pe.id=prf.plano_estruturado_id
  where prf.id=p_refeicao_id;
  if v_ref is null then return; end if;
  v_pre_treino:=lower(trim(v_ref.nome)) in ('pré-treino','pre-treino');

  for v_pref in
    select pref.refeicao_modelo_id,pref.ordem,rm.nome,
           row_number() over(order by pref.ordem,rm.nome)::integer numero
    from public.protocolo_refeicoes pr
    join public.protocolo_refeicoes_preferidas pref on pref.protocolo_refeicao_id=pr.id
    join public.refeicoes_modelo rm on rm.id=pref.refeicao_modelo_id and rm.biblioteca='clinica_v1' and rm.ativo=true
    where pr.protocolo_id=v_ref.protocolo_id and pr.nome=v_ref.nome
    order by pref.ordem,rm.nome limit 3
  loop
    v_numero:=v_pref.numero;
    if p_somente_alternativas and v_numero=1 then continue; end if;
    if exists(select 1 from public.plano_refeicao_itens where plano_refeicao_id=p_refeicao_id and opcao_numero=v_numero) then continue; end if;
    select id into v_opcao_id from public.refeicao_modelo_opcoes where refeicao_modelo_id=v_pref.refeicao_modelo_id order by ordem limit 1;
    if v_opcao_id is null then continue; end if;
    v_nome_opcao:=regexp_replace(v_pref.nome,'^[A-Z][0-9]{2}\s+','');

    with itens as (
      select i.*,a.kcal_100g,a.proteina_100g,a.carboidrato_100g,a.gordura_100g
      from public.refeicao_modelo_opcao_itens i join public.alimentos a on a.id=i.alimento_id
      where i.opcao_id=v_opcao_id and i.papel_macro<>'livre'
    ), fatores as (
      select fp::numeric/100 fp,fc::numeric/100 fc,fg::numeric/100 fg
      from generate_series(30,250,10) fp
      cross join generate_series(30,250,10) fc
      cross join generate_series(30,250,10) fg
    ), candidatos as (
      select f.fp,f.fc,f.fg,i.*,
        round(greatest(coalesce(i.quantidade_min_g,0),least(coalesce(i.quantidade_max_g,99999),coalesce(i.quantidade_g,0)*
          case i.papel_macro when 'proteina' then f.fp when 'carboidrato' then f.fc when 'gordura' then f.fg else 1 end
        ))/greatest(coalesce(i.arredondamento_g,5),1))*greatest(coalesce(i.arredondamento_g,5),1) q
      from itens i cross join fatores f
    ), totais as (
      select fp,fc,fg,
        sum(case when contabiliza_macros then q*kcal_100g/100 else 0 end) kcal,
        sum(case when contabiliza_macros then q*proteina_100g/100 else 0 end) proteina,
        sum(case when contabiliza_macros then q*carboidrato_100g/100 else 0 end) carbo,
        sum(case when contabiliza_macros then q*gordura_100g/100 else 0 end) gordura
      from candidatos group by fp,fc,fg
    ), e as (
      select *,
        case when coalesce(v_ref.meta_kcal,0)>0 then abs(kcal-v_ref.meta_kcal)/v_ref.meta_kcal else 0 end e_kcal,
        case when coalesce(v_ref.meta_proteina_g,0)>0 then
          case when proteina between v_ref.meta_proteina_g*0.90 and v_ref.meta_proteina_g*1.30 then 0
               when proteina<v_ref.meta_proteina_g*0.90 then (v_ref.meta_proteina_g*0.90-proteina)/v_ref.meta_proteina_g
               else (proteina-v_ref.meta_proteina_g*1.30)/v_ref.meta_proteina_g end else 0 end e_prot,
        case when coalesce(v_ref.meta_carboidrato_g,0)>0 then abs(carbo-v_ref.meta_carboidrato_g)/v_ref.meta_carboidrato_g else 0 end e_carb,
        case when coalesce(v_ref.meta_gordura_g,0)>0 then abs(gordura-v_ref.meta_gordura_g)/v_ref.meta_gordura_g else 0 end e_gord,
        case when coalesce(v_ref.meta_gordura_g,0)>0 and gordura>v_ref.meta_gordura_g then (gordura-v_ref.meta_gordura_g)/v_ref.meta_gordura_g else 0 end e_gord_excesso
      from totais
    )
    select fp,fc,fg into v_fp,v_fc,v_fg from e
    order by
      case when e_kcal<=0.05 then 0 when e_kcal<=0.10 then 1 else 2 end,
      case when v_pre_treino then 5*e_carb + e_prot + 3*e_gord_excesso + 0.5*e_gord
           else 3*e_prot + 2.5*e_carb + e_gord end,
      e_kcal,e_carb,e_prot
    limit 1;

    v_fp:=coalesce(v_fp,1); v_fc:=coalesce(v_fc,1); v_fg:=coalesce(v_fg,1);
    insert into public.plano_refeicao_itens
      (plano_refeicao_id,alimento_id,quantidade_g,fator_escala,ordem,grupo_substituicao_id,papel_macro,contabiliza_macros,quantidade_min_g,quantidade_max_g,arredondamento_g,opcao_numero,opcao_nome)
    select p_refeicao_id,i.alimento_id,
      round(greatest(coalesce(i.quantidade_min_g,0),least(coalesce(i.quantidade_max_g,99999),coalesce(i.quantidade_g,0)*
        case i.papel_macro when 'proteina' then v_fp when 'carboidrato' then v_fc when 'gordura' then v_fg else 1 end
      ))/greatest(coalesce(i.arredondamento_g,5),1))*greatest(coalesce(i.arredondamento_g,5),1),
      case i.papel_macro when 'proteina' then v_fp when 'carboidrato' then v_fc when 'gordura' then v_fg else 1 end,
      i.ordem,i.grupo_substituicao_id,i.papel_macro,i.contabiliza_macros,i.quantidade_min_g,i.quantidade_max_g,coalesce(i.arredondamento_g,5),v_numero,v_nome_opcao
    from public.refeicao_modelo_opcao_itens i
    where i.opcao_id=v_opcao_id and i.papel_macro<>'livre'
    order by i.ordem;
  end loop;
end;
$$;
