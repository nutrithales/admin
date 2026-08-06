-- Observações por refeição dentro do plano de um paciente específico
-- (diferente de `refeicao_modelo_opcoes.observacoes`, que é da biblioteca/
-- template — isso aqui é a nota que o nutricionista escreve pra ESSA
-- refeição, DESSE plano, DESSE paciente. Entra no PDF exportado.)
alter table public.plano_refeicoes add column if not exists observacoes text;
