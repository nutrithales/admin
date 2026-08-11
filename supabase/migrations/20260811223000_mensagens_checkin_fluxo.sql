-- Modelos de mensagem para os check-ins do Fluxo pós-entrega do plano
-- (etapas "09_checkin_3_dias" e "10_checkin_7_dias", já existentes).
-- Só INSERT com "on conflict do nothing" — aditivo, não mexe em modelo
-- nenhum já cadastrado.

insert into public.mensagens_modelos (chave, titulo, corpo) values
  ('checkin_3_dias', 'Check-in 3 dias (pós-plano)',
   'Oi, {{primeiro_nome}}! Já faz 3 dias que você recebeu o seu plano alimentar. Como está sendo colocar em prática? Ficou alguma dúvida sobre as refeições, quantidades ou substituições? Pode me chamar aqui a qualquer momento!'),
  ('checkin_7_dias', 'Check-in 7 dias (pós-plano)',
   'Oi, {{primeiro_nome}}! Já faz uma semana desde a entrega do seu plano. Como você está se sentindo com a alimentação até agora? Tem alguma dificuldade ou precisa de algum ajuste? Estou por aqui para te ajudar!')
on conflict (chave) do nothing;
