-- O pré-treino passou a existir como slot adicional real nos protocolos Performance.
-- Este trigger legado renomeava "Lanche da tarde" para "Pré-treino" e passou a
-- gerar duas refeições com o mesmo nome, bloqueando a criação do plano pelo
-- índice único uq_plano_refeicoes_nome_normalizado.

drop trigger if exists trg_ajustar_slot_performance on public.plano_refeicoes;
drop function if exists public.ajustar_slot_performance_automatico();
