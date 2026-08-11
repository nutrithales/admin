-- Adiciona a etapa "06.1 — Montar plano" ao Fluxo, entre "consulta
-- realizada" e "pós-consulta enviado". Só amplia a lista de valores
-- aceitos pela CHECK constraint já existente (20260811194500) — nenhum
-- valor anterior é removido, nenhum dado existente é alterado.

alter table public.pacientes
  drop constraint if exists pacientes_fluxo_etapa_check;

alter table public.pacientes
  add constraint pacientes_fluxo_etapa_check check (fluxo_etapa in (
    '01_lead_recebido', '02_qualificacao', '03_planos_apresentados',
    'follow_up_1', 'follow_up_2', 'follow_up_3',
    '04_agendado', '04_1_agendado_reconsulta', '05_formulario_materiais',
    '06_consulta_realizada', '06_1_montar_plano', '07_pos_consulta_enviado', '08_plano_entregue',
    '09_checkin_3_dias', '10_checkin_7_dias', '11_confirmar_reconsulta',
    '11_1_aguardando_resposta', '12_renovacao_30_dias', '13_proposta_renovacao',
    '14_plano_encerrado', '15_reativacao_pendente', '16_renovado',
    'nada_agora', 'mandar_mensagem', 'pausa_acompanhamento'
  ));
