-- Estrutura para 3 opções equivalentes por refeição nas Matrizes NTR.
-- Aplicada previamente ao Supabase de produção; este arquivo mantém o
-- repositório alinhado ao schema e à lógica já ativos.

alter table public.plano_refeicao_itens add column if not exists opcao_numero integer not null default 1;
alter table public.plano_refeicao_itens add column if not exists opcao_nome text;
create index if not exists idx_plano_refeicao_itens_opcao on public.plano_refeicao_itens(plano_refeicao_id, opcao_numero, ordem);

insert into public.protocolo_refeicoes_preferidas (protocolo_refeicao_id, refeicao_modelo_id, ordem)
select pr.id, rm.id, x.ordem
from public.protocolos p
join public.protocolo_refeicoes pr on pr.protocolo_id=p.id
join (values
  ('Café da manhã','B02 Bowl proteico',0), ('Café da manhã','B01 Café tradicional',1), ('Café da manhã','B03 Cuscuz com proteína',2),
  ('Lanche da manhã','B06 Mini sanduíche',0), ('Lanche da manhã','B05 Fruta, cottage e castanhas',1), ('Lanche da manhã','B04 Iogurte, fruta e aveia',2),
  ('Almoço','B07 Almoço brasileiro',0), ('Almoço','B08 Almoço carne vermelha',1), ('Almoço','B09 Almoço peixe e tubérculo',2),
  ('Lanche da tarde','B10 Sanduíche completo',0), ('Lanche da tarde','B11 Bowl proteico da tarde',1), ('Lanche da tarde','B12 Cuscuz e ovos',2),
  ('Jantar','B13 Jantar tradicional',0), ('Jantar','B14 Jantar sanduíche',1), ('Jantar','B15 Jantar peixe e batata-doce',2),
  ('Ceia','B04 Iogurte, fruta e aveia',0), ('Ceia','B05 Fruta, cottage e castanhas',1), ('Ceia','B11 Bowl proteico da tarde',2)
) as x(refeicao, modelo, ordem) on x.refeicao=pr.nome
join public.refeicoes_modelo rm on rm.nome=x.modelo and rm.biblioteca='clinica_v1' and rm.ativo=true
where p.nome in ('Matriz NTR — A — 4 refeições','Matriz NTR — C — 6 refeições')
and not exists (
  select 1 from public.protocolo_refeicoes_preferidas e
  where e.protocolo_refeicao_id=pr.id and e.refeicao_modelo_id=rm.id
);

create or replace function public.preencher_opcoes_refeicao_matriz(p_refeicao_id uuid, p_somente_alternativas boolean default false)
returns void
language plpgsql
security definer
set search_path=public
as $$
declare
  v_ref record;
  v_pref record;
  v_opcao_id uuid;
  v_numero integer;
  v_nome_opcao text;
begin
  select prf.*, pe.protocolo_id into v_ref
  from public.plano_refeicoes prf
  join public.planos_estruturados pe on pe.id=prf.plano_estruturado_id
  where prf.id=p_refeicao_id;
  if v_ref is null then return; end if;

  for v_pref in
    select pref.refeicao_modelo_id, pref.ordem, rm.nome,
           row_number() over(order by pref.ordem, rm.nome)::integer as numero
    from public.protocolo_refeicoes pr
    join public.protocolo_refeicoes_preferidas pref on pref.protocolo_refeicao_id=pr.id
    join public.refeicoes_modelo rm on rm.id=pref.refeicao_modelo_id and rm.biblioteca='clinica_v1' and rm.ativo=true
    where pr.protocolo_id=v_ref.protocolo_id and pr.nome=v_ref.nome
    order by pref.ordem, rm.nome limit 3
  loop
    v_numero:=v_pref.numero;
    if p_somente_alternativas and v_numero=1 then continue; end if;
    if exists(select 1 from public.plano_refeicao_itens where plano_refeicao_id=p_refeicao_id and opcao_numero=v_numero) then continue; end if;

    select id into v_opcao_id from public.refeicao_modelo_opcoes
    where refeicao_modelo_id=v_pref.refeicao_modelo_id order by ordem limit 1;
    if v_opcao_id is null then continue; end if;
    v_nome_opcao:=regexp_replace(v_pref.nome, '^[A-Z][0-9]{2}\s+', '');

    with itens as (
      select i.*,a.kcal_100g,a.proteina_100g,a.carboidrato_100g,a.gordura_100g,
        coalesce(i.quantidade_g,0)*a.proteina_100g/100 p_base,
        coalesce(i.quantidade_g,0)*a.carboidrato_100g/100 c_base,
        coalesce(i.quantidade_g,0)*a.gordura_100g/100 g_base
      from public.refeicao_modelo_opcao_itens i
      join public.alimentos a on a.id=i.alimento_id
      where i.opcao_id=v_opcao_id
    ), somas as (
      select
        coalesce(sum(p_base) filter(where papel_macro='proteina' and contabiliza_macros),0) p_role,
        coalesce(sum(p_base) filter(where papel_macro<>'proteina' and papel_macro<>'livre' and contabiliza_macros),0) p_other,
        coalesce(sum(c_base) filter(where papel_macro='carboidrato' and contabiliza_macros),0) c_role,
        coalesce(sum(c_base) filter(where papel_macro<>'carboidrato' and papel_macro<>'livre' and contabiliza_macros),0) c_other,
        coalesce(sum(g_base) filter(where papel_macro='gordura' and contabiliza_macros),0) g_role,
        coalesce(sum(g_base) filter(where papel_macro<>'gordura' and papel_macro<>'livre' and contabiliza_macros),0) g_other
      from itens
    ), fatores as (
      select
        case when coalesce(v_ref.meta_proteina_g,0)>0 and p_role>0 then greatest(0.3,least(3.0,greatest(0,v_ref.meta_proteina_g-p_other)/p_role)) else 1 end pf,
        case when coalesce(v_ref.meta_carboidrato_g,0)>0 and c_role>0 then greatest(0.3,least(3.0,greatest(0,v_ref.meta_carboidrato_g-c_other)/c_role)) else 1 end cf,
        case when coalesce(v_ref.meta_gordura_g,0)>0 and g_role>0 then greatest(0.3,least(3.0,greatest(0,v_ref.meta_gordura_g-g_other)/g_role)) else 1 end gf
      from somas
    ), calculados as (
      select i.*,case i.papel_macro when 'proteina' then f.pf when 'carboidrato' then f.cf when 'gordura' then f.gf else 1 end fator
      from itens i cross join fatores f where i.papel_macro<>'livre'
    ), quantidades as (
      select c.*, greatest(coalesce(c.quantidade_min_g,c.quantidade_g*c.fator), least(coalesce(c.quantidade_max_g,c.quantidade_g*c.fator),c.quantidade_g*c.fator)) q_limitada
      from calculados c
    )
    insert into public.plano_refeicao_itens
      (plano_refeicao_id,alimento_id,quantidade_g,fator_escala,ordem,grupo_substituicao_id,papel_macro,contabiliza_macros,quantidade_min_g,quantidade_max_g,arredondamento_g,opcao_numero,opcao_nome)
    select p_refeicao_id,alimento_id,
      round(q_limitada/greatest(coalesce(arredondamento_g,5),1))*greatest(coalesce(arredondamento_g,5),1),
      fator,ordem,grupo_substituicao_id,papel_macro,contabiliza_macros,quantidade_min_g,quantidade_max_g,coalesce(arredondamento_g,5),v_numero,v_nome_opcao
    from quantidades order by ordem;
  end loop;
end;
$$;

-- Ajustes de equivalência para as alternativas clínicas.
insert into public.refeicao_modelo_opcao_itens
(opcao_id,alimento_id,quantidade_g,ordem,grupo_substituicao_id,papel_macro,contabiliza_macros,quantidade_min_g,quantidade_max_g,arredondamento_g)
select o.id,a.id,15,3,g.id,'gordura',true,5,30,5
from public.refeicoes_modelo rm
join public.refeicao_modelo_opcoes o on o.refeicao_modelo_id=rm.id and o.ordem=0
join public.alimentos a on a.origem_referencia='BRC0002U' and a.biblioteca='clinica_v1'
join public.grupos_substituicao g on g.codigo='GORDURAS' and g.biblioteca='clinica_v1'
where rm.nome='B03 Cuscuz com proteína' and rm.biblioteca='clinica_v1'
and not exists(select 1 from public.refeicao_modelo_opcao_itens i where i.opcao_id=o.id and i.alimento_id=a.id);

update public.refeicao_modelo_opcao_itens i
set quantidade_max_g=450
from public.refeicao_modelo_opcoes o
join public.refeicoes_modelo rm on rm.id=o.refeicao_modelo_id
where i.opcao_id=o.id and rm.nome='B09 Almoço peixe e tubérculo' and rm.biblioteca='clinica_v1' and i.papel_macro='carboidrato';
