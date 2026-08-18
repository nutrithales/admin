-- Garante que toda matriz/metodologia NTR com slot "Lanche da tarde"
-- tenha os três modelos clínicos padrão vinculados.

insert into public.protocolo_refeicoes_preferidas (protocolo_refeicao_id, refeicao_modelo_id, ordem)
select alvo.id, base_pref.refeicao_modelo_id, base_pref.ordem
from public.protocolos p_alvo
join public.protocolo_refeicoes alvo
  on alvo.protocolo_id = p_alvo.id
 and alvo.nome = 'Lanche da tarde'
join public.protocolos p_base
  on p_base.nome = 'Matriz NTR - B - 5 refeições'
join public.protocolo_refeicoes base_slot
  on base_slot.protocolo_id = p_base.id
 and base_slot.nome = 'Lanche da tarde'
join public.protocolo_refeicoes_preferidas base_pref
  on base_pref.protocolo_refeicao_id = base_slot.id
where p_alvo.ativo = true
  and (p_alvo.nome like 'Matriz NTR - %' or p_alvo.nome like 'Metodologia NTR - %')
  and not exists (
    select 1
    from public.protocolo_refeicoes_preferidas x
    where x.protocolo_refeicao_id = alvo.id
      and x.refeicao_modelo_id = base_pref.refeicao_modelo_id
  );

create or replace function public.garantir_modelos_lanche_tarde_protocolo()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_nome_protocolo text;
begin
  if new.nome <> 'Lanche da tarde' then
    return new;
  end if;

  select nome into v_nome_protocolo
  from public.protocolos
  where id = new.protocolo_id;

  if v_nome_protocolo is null
     or not (v_nome_protocolo like 'Matriz NTR - %' or v_nome_protocolo like 'Metodologia NTR - %') then
    return new;
  end if;

  insert into public.protocolo_refeicoes_preferidas (protocolo_refeicao_id, refeicao_modelo_id, ordem)
  select new.id, base_pref.refeicao_modelo_id, base_pref.ordem
  from public.protocolos p_base
  join public.protocolo_refeicoes base_slot
    on base_slot.protocolo_id = p_base.id
   and base_slot.nome = 'Lanche da tarde'
  join public.protocolo_refeicoes_preferidas base_pref
    on base_pref.protocolo_refeicao_id = base_slot.id
  where p_base.nome = 'Matriz NTR - B - 5 refeições'
    and not exists (
      select 1
      from public.protocolo_refeicoes_preferidas x
      where x.protocolo_refeicao_id = new.id
        and x.refeicao_modelo_id = base_pref.refeicao_modelo_id
    );

  return new;
end;
$$;

drop trigger if exists trg_garantir_modelos_lanche_tarde_protocolo on public.protocolo_refeicoes;
create trigger trg_garantir_modelos_lanche_tarde_protocolo
after insert on public.protocolo_refeicoes
for each row execute function public.garantir_modelos_lanche_tarde_protocolo();
