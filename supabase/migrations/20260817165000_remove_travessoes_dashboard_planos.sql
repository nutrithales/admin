do $$
declare r record;
begin
  for r in
    select table_schema, table_name, column_name
    from information_schema.columns
    where table_schema='public' and data_type in ('text','character varying')
  loop
    execute format('update %I.%I set %I = replace(%I, %L, %L) where %I like %L',
      r.table_schema, r.table_name, r.column_name, r.column_name, '—', '-', r.column_name, '%—%');
  end loop;
end $$;

create or replace function public.aplicar_orientacao_premium_matriz()
returns trigger language plpgsql security definer set search_path=public as $$
declare v_eh_matriz boolean; v_total integer; v_offset integer; v_texto text; v_hash bigint;
begin
  select exists(select 1 from public.planos_estruturados pe join public.protocolos p on p.id=pe.protocolo_id where pe.id=new.plano_estruturado_id and p.nome like 'Matriz NTR -%') into v_eh_matriz;
  if not v_eh_matriz then return new; end if;
  select count(*) into v_total from public.matriz_orientacoes_premium where refeicao=new.nome and ativo=true;
  if v_total<=0 then return new; end if;
  v_hash := hashtext(new.plano_estruturado_id::text || ':' || new.nome)::bigint + 2147483648;
  v_offset := mod(v_hash, v_total);
  select texto into v_texto from public.matriz_orientacoes_premium where refeicao=new.nome and ativo=true order by variacao offset v_offset limit 1;
  if v_texto is not null then new.observacoes := trim(both from concat_ws(E'\n\n', nullif(new.observacoes,''), v_texto)); end if;
  return new;
end;
$$;

create or replace function public.lista_vegetais_tipo_a_matriz()
returns text language sql stable security definer set search_path=public as $$
  select 'Vegetais Tipo A - livre: ' || string_agg(a.nome, ', ' order by gsi.ordem) || '. Escolha livremente entre as opções da lista.'
  from public.grupos_substituicao g
  join public.grupo_substituicao_itens gsi on gsi.grupo_id=g.id
  join public.alimentos a on a.id=gsi.alimento_id and a.ativo=true
  where g.codigo='VEG_A' and g.biblioteca='clinica_v1';
$$;

create or replace function public.lista_vegetais_tipo_b_matriz()
returns text language sql stable security definer set search_path=public as $$
  with grp as (select id from public.grupos_substituicao where codigo='VEG_B' and biblioteca='clinica_v1' limit 1),
  ref as (select a.id from public.alimentos a join public.grupo_substituicao_itens i on i.alimento_id=a.id cross join grp where i.grupo_id=grp.id and a.nome='Cenoura cozida' limit 1)
  select 'Vegetais Tipo B - 1 porção: ' || string_agg(a.nome || ' - ' || trim(to_char(public.quantidade_equivalente_grupo(grp.id, ref.id, 100, a.id),'FM999990')) || ' g', ' | ' order by i.ordem) || '. Escolha 1 opção da lista.'
  from grp cross join ref join public.grupo_substituicao_itens i on i.grupo_id=grp.id join public.alimentos a on a.id=i.alimento_id and a.ativo=true;
$$;

create or replace function public.preencher_refeicao_clinica_v1()
returns trigger language plpgsql security definer set search_path=public as $$
declare v_item record; v_subs text; v_observacoes text := ''; v_opcao integer; v_nome text; v_tem_tipo_a boolean := false; v_tem_tipo_b boolean := false;
begin
  if exists(select 1 from public.plano_refeicao_itens where plano_refeicao_id=new.id) then return new; end if;
  perform public.preencher_opcoes_refeicao_matriz(new.id, false);
  if not exists(select 1 from public.plano_refeicao_itens where plano_refeicao_id=new.id) then return new; end if;
  select exists(select 1 from public.protocolo_refeicoes pr join public.planos_estruturados pe on pe.protocolo_id=pr.protocolo_id join public.protocolo_refeicoes_preferidas pref on pref.protocolo_refeicao_id=pr.id join public.refeicoes_modelo rm on rm.id=pref.refeicao_modelo_id join public.refeicao_modelo_opcoes o on o.refeicao_modelo_id=rm.id join public.refeicao_modelo_opcao_itens i on i.opcao_id=o.id and i.papel_macro='livre' where pe.id=new.plano_estruturado_id and pr.nome=new.nome) into v_tem_tipo_a;
  select exists(select 1 from public.plano_refeicao_itens where plano_refeicao_id=new.id and papel_macro='vegetal_b') into v_tem_tipo_b;
  for v_opcao, v_nome in select opcao_numero, coalesce(max(opcao_nome),'Opção '||opcao_numero) from public.plano_refeicao_itens where plano_refeicao_id=new.id group by opcao_numero order by opcao_numero loop
    v_observacoes := v_observacoes || case when v_observacoes='' then '' else E'\n\n' end || 'Opção '||v_opcao||' - '||v_nome||':';
    for v_item in select pi.alimento_id,pi.grupo_substituicao_id,pi.quantidade_g,a.nome,g.codigo as grupo_codigo from public.plano_refeicao_itens pi join public.alimentos a on a.id=pi.alimento_id left join public.grupos_substituicao g on g.id=pi.grupo_substituicao_id where pi.plano_refeicao_id=new.id and pi.opcao_numero=v_opcao and pi.grupo_substituicao_id is not null and coalesce(g.codigo,'') not in ('VEG_A','VEG_B') order by pi.ordem loop
      select string_agg(x.nome||' - '||trim(to_char(x.q,'FM999990'))||' g',' | ' order by x.ordem) into v_subs from (select a2.nome,gsi.ordem,public.quantidade_equivalente_grupo(v_item.grupo_substituicao_id,v_item.alimento_id,v_item.quantidade_g,a2.id) q from public.grupo_substituicao_itens gsi join public.alimentos a2 on a2.id=gsi.alimento_id and a2.ativo=true where gsi.grupo_id=v_item.grupo_substituicao_id and gsi.alimento_id<>v_item.alimento_id order by gsi.ordem limit 4) x where x.q is not null;
      if v_subs is not null then v_observacoes := v_observacoes || E'\n' || 'Substituições para '||v_item.nome||' ('||trim(to_char(v_item.quantidade_g,'FM999990'))||' g): '||v_subs||'.'; end if;
    end loop;
  end loop;
  if v_tem_tipo_a then v_observacoes := v_observacoes || E'\n\n' || public.lista_vegetais_tipo_a_matriz(); end if;
  if v_tem_tipo_b then v_observacoes := v_observacoes || E'\n' || public.lista_vegetais_tipo_b_matriz(); end if;
  if v_observacoes<>'' then update public.plano_refeicoes set observacoes=trim(both from concat_ws(E'\n\n',nullif(observacoes,''),v_observacoes)) where id=new.id; end if;
  return new;
end;
$$;