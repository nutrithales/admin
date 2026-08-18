do $$
declare
  v_tapioca uuid;
  v_grupo uuid;
begin
  select id into v_tapioca
  from public.alimentos
  where biblioteca='clinica_v1' and origem_referencia='BRC0906B'
  limit 1;

  if v_tapioca is null then
    insert into public.alimentos (
      nome, origem, origem_referencia, kcal_100g, proteina_100g, carboidrato_100g,
      gordura_100g, porcao_padrao_g, categoria, grupo_alimentar, unidade_padrao,
      medidas_caseiras, ativo, revisado_manualmente, biblioteca
    ) values (
      'Tapioca sem manteiga e sem recheio', 'TBCA 7.3', 'BRC0906B', 289, 0.36, 71.9,
      0, 60, 'carboidrato', 'carboidrato', 'g',
      '[{"peso_g":60,"unidade":"Unidade média"}]'::jsonb, true, true, 'clinica_v1'
    ) returning id into v_tapioca;
  end if;

  select id into v_grupo from public.grupos_substituicao where codigo='C_CAFE' and ativo=true limit 1;

  if v_grupo is not null then
    insert into public.grupo_substituicao_itens (grupo_id, alimento_id, ordem)
    select v_grupo, v_tapioca, coalesce((select max(ordem)+1 from public.grupo_substituicao_itens where grupo_id=v_grupo),0)
    where not exists (
      select 1 from public.grupo_substituicao_itens where grupo_id=v_grupo and alimento_id=v_tapioca
    );

    update public.plano_refeicao_itens i
       set grupo_substituicao_id=v_grupo,
           papel_macro=coalesce(i.papel_macro,'carboidrato')
      from public.alimentos a
     where i.alimento_id=a.id
       and i.grupo_substituicao_id is null
       and (lower(a.nome) like 'pão%' or lower(a.nome) like 'pao%');
  end if;
end $$;

create or replace function public.garantir_grupo_substituicao_pao()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  v_nome text;
  v_grupo uuid;
begin
  if new.alimento_id is null or new.grupo_substituicao_id is not null then
    return new;
  end if;

  select nome into v_nome from public.alimentos where id=new.alimento_id;
  if v_nome is null or not (lower(v_nome) like 'pão%' or lower(v_nome) like 'pao%') then
    return new;
  end if;

  select id into v_grupo from public.grupos_substituicao where codigo='C_CAFE' and ativo=true limit 1;
  if v_grupo is not null then
    new.grupo_substituicao_id := v_grupo;
    new.papel_macro := coalesce(new.papel_macro,'carboidrato');
  end if;
  return new;
end;
$$;

drop trigger if exists trg_garantir_grupo_substituicao_pao on public.plano_refeicao_itens;
create trigger trg_garantir_grupo_substituicao_pao
before insert or update of alimento_id, grupo_substituicao_id on public.plano_refeicao_itens
for each row execute function public.garantir_grupo_substituicao_pao();
