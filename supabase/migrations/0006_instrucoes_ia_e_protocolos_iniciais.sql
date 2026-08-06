-- Nutri Thales Rosa — Instruções extras pra IA + protocolos iniciais
--
-- 1) `planos_estruturados.instrucoes_ia`: campo livre onde o nutricionista
--    anota contexto/instruções extras pra quando a Fase 4 (geração de
--    rascunho por IA) existir — nunca interpretado sozinho, sempre lido
--    junto com o perfil do paciente e as regras do protocolo.
--
-- 2) Protocolos pré-estabelecidos (estrutura + faixas de macro baseadas em
--    diretrizes gerais de nutrição esportiva — g/kg e %kcal, não valores
--    fixos, então servem pra qualquer meta calórica que o nutricionista
--    definir no plano do paciente). Cada um com os 5 horários padrão
--    (café da manhã, lanche da manhã, almoço, lanche da tarde, jantar).
--    Ainda SEM refeições/receitas vinculadas — isso depende da base de
--    alimentos real (TACO/TBCA) que ainda não foi importada.

alter table public.planos_estruturados add column if not exists instrucoes_ia text;

do $$
declare
  v_protocolo_id uuid;
begin
  -- Emagrecimento
  if not exists (select 1 from public.protocolos where nome = 'Metodologia NTR — Emagrecimento') then
    insert into public.protocolos (nome, descricao, ativo)
    values (
      'Metodologia NTR — Emagrecimento',
      'Déficit calórico moderado, preservando massa magra e priorizando adesão — sem alimentos proibidos, foco em praticidade e consistência.',
      true
    )
    returning id into v_protocolo_id;

    insert into public.protocolo_refeicoes (protocolo_id, nome, ordem, percentual_kcal) values
      (v_protocolo_id, 'Café da manhã', 0, 25),
      (v_protocolo_id, 'Lanche da manhã', 1, 10),
      (v_protocolo_id, 'Almoço', 2, 30),
      (v_protocolo_id, 'Lanche da tarde', 3, 10),
      (v_protocolo_id, 'Jantar', 4, 25);

    insert into public.protocolo_regras_macro
      (protocolo_id, proteina_g_por_kg_min, proteina_g_por_kg_max, gordura_percentual_kcal_min, gordura_percentual_kcal_max)
    values (v_protocolo_id, 1.8, 2.4, 20, 30);
  end if;

  -- Hipertrofia
  if not exists (select 1 from public.protocolos where nome = 'Metodologia NTR — Hipertrofia') then
    insert into public.protocolos (nome, descricao, ativo)
    values (
      'Metodologia NTR — Hipertrofia',
      'Superávit ou manutenção calórica com ênfase em proteína e praticidade ao redor do treino.',
      true
    )
    returning id into v_protocolo_id;

    insert into public.protocolo_refeicoes (protocolo_id, nome, ordem, percentual_kcal) values
      (v_protocolo_id, 'Café da manhã', 0, 20),
      (v_protocolo_id, 'Lanche da manhã', 1, 15),
      (v_protocolo_id, 'Almoço', 2, 30),
      (v_protocolo_id, 'Lanche da tarde', 3, 10),
      (v_protocolo_id, 'Jantar', 4, 25);

    insert into public.protocolo_regras_macro
      (protocolo_id, proteina_g_por_kg_min, proteina_g_por_kg_max, gordura_percentual_kcal_min, gordura_percentual_kcal_max)
    values (v_protocolo_id, 1.6, 2.2, 20, 30);
  end if;

  -- Manutenção
  if not exists (select 1 from public.protocolos where nome = 'Metodologia NTR — Manutenção') then
    insert into public.protocolos (nome, descricao, ativo)
    values (
      'Metodologia NTR — Manutenção',
      'Equilíbrio calórico, variedade alimentar e sustentabilidade de hábitos — sem restrição de grupos alimentares.',
      true
    )
    returning id into v_protocolo_id;

    insert into public.protocolo_refeicoes (protocolo_id, nome, ordem, percentual_kcal) values
      (v_protocolo_id, 'Café da manhã', 0, 25),
      (v_protocolo_id, 'Lanche da manhã', 1, 10),
      (v_protocolo_id, 'Almoço', 2, 30),
      (v_protocolo_id, 'Lanche da tarde', 3, 10),
      (v_protocolo_id, 'Jantar', 4, 25);

    insert into public.protocolo_regras_macro
      (protocolo_id, proteina_g_por_kg_min, proteina_g_por_kg_max, gordura_percentual_kcal_min, gordura_percentual_kcal_max)
    values (v_protocolo_id, 1.2, 1.6, 25, 35);
  end if;
end $$;
