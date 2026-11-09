create table public.corrida_ciclos (
 id uuid primary key default gen_random_uuid(),
 paciente_id uuid not null references public.pacientes(id) on delete cascade,
 mes date not null,
 liberar_em date not null,
 titulo text not null,
 objetivo text not null,
 orientacoes text not null default '',
 ativo boolean not null default true,
 created_at timestamptz not null default now(),
 unique(paciente_id,mes),
 check(extract(day from mes)=1), check(liberar_em=mes)
);
create table public.corrida_treinos (
 id uuid primary key default gen_random_uuid(),
 ciclo_id uuid not null references public.corrida_ciclos(id) on delete cascade,
 data_planejada date not null,
 nome text not null,
 aquecimento text not null,
 principal text not null,
 finalizacao text not null,
 esforco text not null,
 minutos_previstos numeric check(minutos_previstos>0),
 distancia_prevista numeric check(distancia_prevista>0),
 observacoes text not null default '',
 ordem integer not null default 0,
 unique(ciclo_id,data_planejada)
);
create table public.corrida_registros (
 id uuid primary key default gen_random_uuid(),
 treino_id uuid not null unique references public.corrida_treinos(id) on delete restrict,
 paciente_id uuid not null references public.pacientes(id) on delete cascade,
 data_realizada date not null,
 concluido boolean not null default false,
 duracao_seg integer check(duracao_seg>0 and duracao_seg<=86400),
 distancia_km numeric check(distancia_km>0 and distancia_km<=1000),
 rpe integer check(rpe between 0 and 10),
 dor integer check(dor between 0 and 10),
 sono_horas numeric check(sono_horas between 0 and 24),
 fc_media integer check(fc_media between 30 and 250),
 terreno text not null default '' check(terreno in ('','Rua','Esteira','Pista','Trilha')),
 feedback text not null default '' check(char_length(feedback)<=3000),
 updated_at timestamptz not null default now(),
 check(data_realizada <= (now() at time zone 'America/Sao_Paulo')::date)
);
create index corrida_treinos_ciclo_ordem on public.corrida_treinos(ciclo_id,ordem);
create index corrida_registros_paciente on public.corrida_registros(paciente_id,data_realizada);
alter table public.corrida_ciclos enable row level security;
alter table public.corrida_treinos enable row level security;
alter table public.corrida_registros enable row level security;
grant select,insert,update,delete on public.corrida_ciclos,public.corrida_treinos,public.corrida_registros to authenticated;
revoke all on public.corrida_ciclos,public.corrida_treinos,public.corrida_registros from anon;
create policy corrida_ciclos_admin on public.corrida_ciclos for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy corrida_ciclos_paciente on public.corrida_ciclos for select to authenticated using(ativo and exists(select 1 from public.pacientes p where p.id=corrida_ciclos.paciente_id and p.auth_id=(select auth.uid())));
create policy corrida_treinos_admin on public.corrida_treinos for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy corrida_treinos_paciente on public.corrida_treinos for select to authenticated using(exists(select 1 from public.corrida_ciclos c join public.pacientes p on p.id=c.paciente_id where c.id=corrida_treinos.ciclo_id and c.ativo and p.auth_id=(select auth.uid()) and c.liberar_em <= (now() at time zone 'America/Sao_Paulo')::date));
create policy corrida_registros_admin on public.corrida_registros for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy corrida_registros_paciente_select on public.corrida_registros for select to authenticated using(exists(select 1 from public.corrida_treinos t join public.corrida_ciclos c on c.id=t.ciclo_id join public.pacientes p on p.id=c.paciente_id where t.id=corrida_registros.treino_id and c.paciente_id=corrida_registros.paciente_id and p.auth_id=(select auth.uid()) and c.ativo and c.liberar_em <= (now() at time zone 'America/Sao_Paulo')::date));
create policy corrida_registros_paciente_insert on public.corrida_registros for insert to authenticated with check(exists(select 1 from public.corrida_treinos t join public.corrida_ciclos c on c.id=t.ciclo_id join public.pacientes p on p.id=c.paciente_id where t.id=corrida_registros.treino_id and c.paciente_id=corrida_registros.paciente_id and p.auth_id=(select auth.uid()) and c.ativo and c.liberar_em <= (now() at time zone 'America/Sao_Paulo')::date));
create policy corrida_registros_paciente_update on public.corrida_registros for update to authenticated using(exists(select 1 from public.corrida_treinos t join public.corrida_ciclos c on c.id=t.ciclo_id join public.pacientes p on p.id=c.paciente_id where t.id=corrida_registros.treino_id and c.paciente_id=corrida_registros.paciente_id and p.auth_id=(select auth.uid()) and c.ativo and c.liberar_em <= (now() at time zone 'America/Sao_Paulo')::date)) with check(exists(select 1 from public.corrida_treinos t join public.corrida_ciclos c on c.id=t.ciclo_id join public.pacientes p on p.id=c.paciente_id where t.id=corrida_registros.treino_id and c.paciente_id=corrida_registros.paciente_id and p.auth_id=(select auth.uid()) and c.ativo and c.liberar_em <= (now() at time zone 'America/Sao_Paulo')::date));
