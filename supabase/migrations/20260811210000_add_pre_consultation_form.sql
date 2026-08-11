create table if not exists public.formularios_pre_consulta (
  id uuid primary key default gen_random_uuid(),
  paciente_id uuid not null unique references public.pacientes(id) on delete cascade,
  auth_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pendente' check (status in ('pendente', 'respondido')),
  respostas jsonb not null default '{}'::jsonb,
  consentimento_dados_saude boolean not null default false,
  solicitado_em timestamptz not null default now(),
  respondido_em timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.formularios_pre_consulta enable row level security;
grant select on public.formularios_pre_consulta to authenticated;
grant select, insert, update, delete on public.formularios_pre_consulta to service_role;

create policy "usuario autorizado le formulario pre consulta"
on public.formularios_pre_consulta for select to authenticated
using (public.is_admin() or (select auth.uid()) = auth_id);

create policy "admin cria formulario pre consulta"
on public.formularios_pre_consulta for insert to authenticated
with check (public.is_admin());

create policy "admin atualiza formulario pre consulta"
on public.formularios_pre_consulta for update to authenticated
using (public.is_admin()) with check (public.is_admin());

create policy "admin exclui formulario pre consulta"
on public.formularios_pre_consulta for delete to authenticated
using (public.is_admin());

create index formularios_pre_consulta_auth_id_idx
on public.formularios_pre_consulta(auth_id);
