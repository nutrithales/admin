-- Additive extension. Existing ownership and month-release RLS policies continue to apply.
alter table public.corrida_ciclos add column pace_automatico boolean not null default false;
alter table public.corrida_treinos add column blocos jsonb not null default '[]'::jsonb
  check (jsonb_typeof(blocos) = 'array' and jsonb_array_length(blocos) <= 32);
alter table public.corrida_registros add column resultados_blocos jsonb not null default '[]'::jsonb
  check (jsonb_typeof(resultados_blocos) = 'array' and jsonb_array_length(resultados_blocos) <= 32);
alter table public.corrida_registros add column alvos_snapshot jsonb not null default '[]'::jsonb
  check (jsonb_typeof(alvos_snapshot) = 'array' and jsonb_array_length(alvos_snapshot) <= 32);
