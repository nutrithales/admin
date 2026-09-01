-- Vigência opcional dos treinos. Datas nulas mantêm o comportamento atual.
alter table public.treino_programas
  add column if not exists data_inicio date,
  add column if not exists data_fim date;

alter table public.treino_programas
  drop constraint if exists treino_programas_vigencia_valida;

alter table public.treino_programas
  add constraint treino_programas_vigencia_valida
  check (data_inicio is null or data_fim is null or data_fim >= data_inicio);

create index if not exists treino_programas_paciente_vigencia_idx
  on public.treino_programas (paciente_id, status, data_inicio, data_fim);

comment on column public.treino_programas.data_inicio is
  'Primeiro dia em que o treino fica visível para o paciente; nulo libera imediatamente.';
comment on column public.treino_programas.data_fim is
  'Último dia em que o treino fica visível para o paciente; nulo mantém sem prazo.';
