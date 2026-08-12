-- Modelos de mensagem para o funil de renovação (etapas "12_renovacao_30_dias"
-- -> "13_proposta_renovacao" -> "15_reativacao_pendente") e para o lembrete
-- de reconsulta no meio do plano (etapa "11_confirmar_reconsulta").
-- Só INSERT com "on conflict do nothing" — aditivo, não mexe em modelo
-- nenhum já cadastrado.

insert into public.mensagens_modelos (chave, titulo, corpo) values
  ('proposta_renovacao', 'Proposta de renovação',
   'Oi, {{primeiro_nome}}! Seu {{plano}} chegou ao fim ({{consultas_realizadas}} consultas realizadas). Que tal darmos continuidade ao seu acompanhamento? Posso te enviar as opções de plano para renovar.'),
  ('confirmar_reconsulta', 'Confirmar reconsulta',
   'Oi, {{primeiro_nome}}! Ainda temos {{consultas_restantes}} consulta(s) do seu {{plano}} para usar. Vamos marcar sua próxima consulta para continuar o acompanhamento?')
on conflict (chave) do nothing;
