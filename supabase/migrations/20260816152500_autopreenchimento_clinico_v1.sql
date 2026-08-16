create or replace function public.quantidade_equivalente_grupo(
  p_grupo_id uuid,
  p_alimento_origem uuid,
  p_quantidade_origem numeric,
  p_alimento_destino uuid
) returns numeric
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_macro text;
  v_origem record;
  v_destino record;
  v_membro record;
  v_valor_origem numeric;
  v_valor_destino numeric;
  v_quantidade numeric;
  v_passo numeric;
begin
  if p_grupo_id is null or p_alimento_origem is null or p_alimento_destino is null or coalesce(p_quantidade_origem,0) <= 0 then
    return null;
  end if;

  select macro_referencia into v_macro
  from public.grupos_substituicao
  where id=p_grupo_id and ativo=true;

  if v_macro is null or v_macro='livre' then return null; end if;

  select kcal_100g,proteina_100g,carboidrato_100g,gordura_100g into v_origem
  from public.alimentos where id=p_alimento_origem and ativo=true;
  select kcal_100g,proteina_100g,carboidrato_100g,gordura_100g into v_destino
  from public.alimentos where id=p_alimento_destino and ativo=true;
  select arredondamento_g,porcao_min_g,porcao_max_g into v_membro
  from public.grupo_substituicao_itens
  where grupo_id=p_grupo_id and alimento_id=p_alimento_destino;

  if v_origem is null or v_destino is null or v_membro is null then return null; end if;

  v_valor_origem := case v_macro
    when 'proteina' then v_origem.proteina_100g
    when 'carboidrato' then v_origem.carboidrato_100g
    when 'gordura' then v_origem.gordura_100g
    else v_origem.kcal_100g end;
  v_valor_destino := case v_macro
    when 'proteina' then v_destino.proteina_100g
    when 'carboidrato' then v_destino.carboidrato_100g
    when 'gordura' then v_destino.gordura_100g
    else v_destino.kcal_100g end;

  if coalesce(v_valor_origem,0)<=0 or coalesce(v_valor_destino,0)<=0 then return null; end if;

  v_quantidade := p_quantidade_origem * v_valor_origem / v_valor_destino;
  if v_membro.porcao_min_g is not null then v_quantidade := greatest(v_quantidade,v_membro.porcao_min_g); end if;
  if v_membro.porcao_max_g is not null then v_quantidade := least(v_quantidade,v_membro.porcao_max_g); end if;
  v_passo := greatest(coalesce(v_membro.arredondamento_g,5),1);
  v_quantidade := round(v_quantidade/v_passo)*v_passo;
  return greatest(v_quantidade,v_passo);
end;
$$;

create or replace function public.preencher_refeicao_clinica_v1()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_modelo_id uuid;
  v_opcao_id uuid;
  v_tem_livre boolean := false;
  v_observacoes text := '';
  v_item record;
  v_subs text;
  v_livres text;
begin
  if exists(select 1 from public.plano_refeicao_itens where plano_refeicao_id=new.id) then return new; end if;

  select pref.refeicao_modelo_id into v_modelo_id
  from public.planos_estruturados pe
  join public.protocolo_refeicoes pr on pr.protocolo_id=pe.protocolo_id and pr.nome=new.nome
  join public.protocolo_refeicoes_preferidas pref on pref.protocolo_refeicao_id=pr.id
  join public.refeicoes_modelo rm on rm.id=pref.refeicao_modelo_id and rm.biblioteca='clinica_v1' and rm.ativo=true
  where pe.id=new.plano_estruturado_id
  order by pref.ordem
  limit 1;

  if v_modelo_id is null then return new; end if;

  select id into v_opcao_id from public.refeicao_modelo_opcoes
  where refeicao_modelo_id=v_modelo_id order by ordem limit 1;
  if v_opcao_id is null then return new; end if;

  select exists(select 1 from public.refeicao_modelo_opcao_itens where opcao_id=v_opcao_id and papel_macro='livre') into v_tem_livre;

  with itens as (
    select i.*,a.kcal_100g,a.proteina_100g,a.carboidrato_100g,a.gordura_100g,
      coalesce(i.quantidade_g,0)*a.proteina_100g/100 as p_base,
      coalesce(i.quantidade_g,0)*a.carboidrato_100g/100 as c_base,
      coalesce(i.quantidade_g,0)*a.gordura_100g/100 as g_base
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
      case when coalesce(new.meta_proteina_g,0)>0 and p_role>0 then greatest(0.3,least(3.0,greatest(0,new.meta_proteina_g-p_other)/p_role)) else 1 end pf,
      case when coalesce(new.meta_carboidrato_g,0)>0 and c_role>0 then greatest(0.3,least(3.0,greatest(0,new.meta_carboidrato_g-c_other)/c_role)) else 1 end cf,
      case when coalesce(new.meta_gordura_g,0)>0 and g_role>0 then greatest(0.3,least(3.0,greatest(0,new.meta_gordura_g-g_other)/g_role)) else 1 end gf
    from somas
  ), calculados as (
    select i.*,
      case i.papel_macro when 'proteina' then f.pf when 'carboidrato' then f.cf when 'gordura' then f.gf else 1 end fator
    from itens i cross join fatores f
    where i.papel_macro<>'livre'
  ), quantidades as (
    select c.*,
      greatest(coalesce(c.quantidade_min_g,c.quantidade_g*c.fator),
        least(coalesce(c.quantidade_max_g,c.quantidade_g*c.fator),c.quantidade_g*c.fator)) q_limitada
    from calculados c
  )
  insert into public.plano_refeicao_itens
    (plano_refeicao_id,alimento_id,quantidade_g,fator_escala,ordem,grupo_substituicao_id,papel_macro,contabiliza_macros,quantidade_min_g,quantidade_max_g,arredondamento_g)
  select new.id,alimento_id,
    round(q_limitada/greatest(coalesce(arredondamento_g,5),1))*greatest(coalesce(arredondamento_g,5),1),
    fator,ordem,grupo_substituicao_id,papel_macro,contabiliza_macros,quantidade_min_g,quantidade_max_g,coalesce(arredondamento_g,5)
  from quantidades order by ordem;

  for v_item in
    select pi.alimento_id,pi.grupo_substituicao_id,pi.quantidade_g,a.nome
    from public.plano_refeicao_itens pi join public.alimentos a on a.id=pi.alimento_id
    where pi.plano_refeicao_id=new.id and pi.grupo_substituicao_id is not null
    order by pi.ordem
  loop
    select string_agg(x.nome||' — '||trim(to_char(x.q,'FM999990'))||' g',' | ' order by x.ordem) into v_subs
    from (
      select a2.nome,gsi.ordem,public.quantidade_equivalente_grupo(v_item.grupo_substituicao_id,v_item.alimento_id,v_item.quantidade_g,a2.id) q
      from public.grupo_substituicao_itens gsi join public.alimentos a2 on a2.id=gsi.alimento_id and a2.ativo=true
      where gsi.grupo_id=v_item.grupo_substituicao_id and gsi.alimento_id<>v_item.alimento_id
      order by gsi.ordem limit 4
    ) x where x.q is not null;
    if v_subs is not null then
      v_observacoes := v_observacoes || case when v_observacoes='' then '' else E'\n' end || 'Substituições para '||v_item.nome||' ('||trim(to_char(v_item.quantidade_g,'FM999990'))||' g): '||v_subs||'.';
    end if;
  end loop;

  if v_tem_livre then
    select string_agg(a.nome,', ' order by gsi.ordem) into v_livres
    from public.grupos_substituicao g join public.grupo_substituicao_itens gsi on gsi.grupo_id=g.id join public.alimentos a on a.id=gsi.alimento_id
    where g.codigo='VEG_A' and g.biblioteca='clinica_v1';
    v_observacoes := v_observacoes || case when v_observacoes='' then '' else E'\n' end || 'Vegetais Tipo A — LIVRE: '||coalesce(v_livres,'vegetais Tipo A')||'.';
  end if;

  if v_observacoes<>'' then
    update public.plano_refeicoes set observacoes=trim(both from concat_ws(E'\n',nullif(observacoes,''),v_observacoes)) where id=new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_preencher_refeicao_clinica_v1 on public.plano_refeicoes;
create trigger trg_preencher_refeicao_clinica_v1
after insert on public.plano_refeicoes
for each row execute function public.preencher_refeicao_clinica_v1();

create or replace function public.ajustar_quantidade_substituicao_clinica_v1()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  v_q numeric;
begin
  if new.alimento_id is distinct from old.alimento_id and old.grupo_substituicao_id is not null and old.alimento_id is not null and old.quantidade_g is not null then
    if exists(select 1 from public.grupo_substituicao_itens where grupo_id=old.grupo_substituicao_id and alimento_id=new.alimento_id) then
      v_q:=public.quantidade_equivalente_grupo(old.grupo_substituicao_id,old.alimento_id,old.quantidade_g,new.alimento_id);
      if v_q is not null then new.quantidade_g:=v_q; end if;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_ajustar_quantidade_substituicao_clinica_v1 on public.plano_refeicao_itens;
create trigger trg_ajustar_quantidade_substituicao_clinica_v1
before update of alimento_id on public.plano_refeicao_itens
for each row execute function public.ajustar_quantidade_substituicao_clinica_v1();

update public.refeicao_modelo_opcao_itens i
set grupo_substituicao_id=g.id
from public.refeicao_modelo_opcoes o, public.refeicoes_modelo r, public.grupos_substituicao g
where i.opcao_id=o.id and o.refeicao_modelo_id=r.id and r.nome='B14 Jantar sanduíche' and r.biblioteca='clinica_v1'
  and i.papel_macro='proteina' and g.codigo='P_PRATO' and g.biblioteca='clinica_v1';
