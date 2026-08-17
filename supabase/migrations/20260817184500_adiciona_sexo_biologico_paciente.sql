alter table public.pacientes
  add column if not exists sexo_biologico text;

alter table public.pacientes
  drop constraint if exists pacientes_sexo_biologico_check;

alter table public.pacientes
  add constraint pacientes_sexo_biologico_check
  check (sexo_biologico is null or sexo_biologico in ('masculino', 'feminino'));
