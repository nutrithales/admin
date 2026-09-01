-- Copia o programa ativo de Leandro Borges para Luiz Felipe Thomaz Moreira.
-- A copia preserva a prescricao e seus exercicios, sem compartilhar progresso
-- ou historico de execucoes entre os pacientes.

do $$
declare
  v_origem_id uuid;
  v_destino_id uuid;
  v_novo_treino_id uuid;
  v_ordem integer;
  v_treino record;
begin
  select id
    into v_origem_id
  from public.pacientes
  where lower(email) = 'leandrolego2@gmail.com'
  limit 1;

  select id
    into v_destino_id
  from public.pacientes
  where lower(email) = 'felipethm@outlook.com'
  limit 1;

  if v_origem_id is null then
    raise exception 'Paciente de origem Leandro Borges nao encontrado';
  end if;

  if v_destino_id is null then
    raise exception 'Paciente de destino Luiz Felipe Thomaz Moreira nao encontrado';
  end if;

  select coalesce(max(ordem), 0)
    into v_ordem
  from public.treino_programas
  where paciente_id = v_destino_id;

  for v_treino in
    select t.*
    from public.treino_programas t
    where t.paciente_id = v_origem_id
      and t.status = 'ativo'
    order by t.ordem, t.created_at
  loop
    if exists (
      select 1
      from public.treino_programas existente
      where existente.paciente_id = v_destino_id
        and existente.status <> 'arquivado'
        and existente.nome = v_treino.nome
        and existente.codigo is not distinct from v_treino.codigo
    ) then
      continue;
    end if;

    v_ordem := v_ordem + 1;

    insert into public.treino_programas (
      paciente_id,
      nome,
      codigo,
      objetivo,
      bloco,
      ordem,
      status,
      observacoes,
      frequencia_semanal,
      template_id
    ) values (
      v_destino_id,
      v_treino.nome,
      v_treino.codigo,
      v_treino.objetivo,
      v_treino.bloco,
      v_ordem,
      'ativo',
      v_treino.observacoes,
      v_treino.frequencia_semanal,
      v_treino.template_id
    )
    returning id into v_novo_treino_id;

    insert into public.treino_exercicios (
      treino_id,
      bloco_ordem,
      bloco_nome,
      ordem,
      nome,
      series,
      repeticoes,
      rir,
      rpe,
      descanso_seg,
      carga_inicial,
      video_url,
      observacoes,
      exercicio_biblioteca_id
    )
    select
      v_novo_treino_id,
      exercicio.bloco_ordem,
      exercicio.bloco_nome,
      exercicio.ordem,
      exercicio.nome,
      exercicio.series,
      exercicio.repeticoes,
      exercicio.rir,
      exercicio.rpe,
      exercicio.descanso_seg,
      exercicio.carga_inicial,
      exercicio.video_url,
      exercicio.observacoes,
      exercicio.exercicio_biblioteca_id
    from public.treino_exercicios exercicio
    where exercicio.treino_id = v_treino.id
    order by exercicio.bloco_ordem, exercicio.ordem;
  end loop;

  update public.pacientes
  set treino_liberado = true,
      treino_frequencia_semanal = 4
  where id = v_destino_id;
end
$$;
