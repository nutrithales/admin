-- Nutri Thales Rosa — Prontuário e Avaliação Física
--
-- Área de registro clínico privado por paciente/consulta (prontuário,
-- resumo do Granola, antropometria, PDF do Bodymetrix + interpretação por
-- IA) e um mecanismo de liberação seletiva do RESUMO da avaliação para o
-- paciente. Só ADICIONA — nunca renomeia/remove nada existente.
--
-- Desenho de RLS importante: `avaliacoes_fisicas` guarda os dados clínicos
-- completos (antropometria, PDF, interpretação da IA) e NUNCA tem política
-- de leitura para o paciente, nem mesmo depois de "liberada" — porque RLS
-- do Postgres filtra linhas, não colunas, então qualquer policy de leitura
-- nessa tabela exporia a linha inteira. O que fica visível ao paciente
-- quando o nutricionista libera é só o texto-resumo, copiado para a
-- tabela separada `avaliacoes_resumos_paciente`, que é a única com policy
-- de leitura para o paciente.

create extension if not exists pgcrypto;

-- =========================================================================
-- consulta_prontuarios — nunca exposto ao paciente.
-- =========================================================================
create table if not exists public.consulta_prontuarios (
  id uuid primary key default gen_random_uuid(),
  consulta_id uuid not null unique references public.consultas (id) on delete cascade,
  prontuario text,
  -- colado manualmente pelo nutricionista a partir do resumo da reunião no
  -- Granola — sem integração automática com a API do Granola por enquanto.
  resumo_granola text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.consulta_prontuarios enable row level security;

drop policy if exists "admins gerenciam consulta_prontuarios" on public.consulta_prontuarios;
create policy "admins gerenciam consulta_prontuarios"
  on public.consulta_prontuarios for all
  using (public.is_admin())
  with check (public.is_admin());

-- =========================================================================
-- avaliacoes_fisicas — dados clínicos completos, sempre privados.
-- =========================================================================
create table if not exists public.avaliacoes_fisicas (
  id uuid primary key default gen_random_uuid(),
  auth_id uuid not null references auth.users (id) on delete cascade,
  consulta_id uuid references public.consultas (id) on delete set null,
  data timestamptz not null default now(),

  peso_kg numeric,
  altura_cm numeric,
  circunferencia_cintura_cm numeric,
  circunferencia_quadril_cm numeric,
  circunferencia_braco_cm numeric,
  circunferencia_coxa_cm numeric,
  percentual_gordura numeric,
  massa_magra_kg numeric,
  massa_gorda_kg numeric,
  -- qualquer medida fora da lista padrão acima, sem precisar de migração.
  medidas_extra jsonb not null default '{}'::jsonb,

  bucket text,
  path text,

  -- sempre privado, mesmo depois de "liberado" — só o resumo é
  -- compartilhável (ver avaliacoes_resumos_paciente).
  interpretacao_ia text,
  -- rascunho do texto que PODE ser liberado; editável antes de liberar.
  resumo_paciente text,

  disponivel_paciente boolean not null default false,
  disponibilizado_em timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists avaliacoes_fisicas_auth_id_idx on public.avaliacoes_fisicas (auth_id);
create index if not exists avaliacoes_fisicas_consulta_idx on public.avaliacoes_fisicas (consulta_id);

alter table public.avaliacoes_fisicas enable row level security;

drop policy if exists "admins gerenciam avaliacoes_fisicas" on public.avaliacoes_fisicas;
create policy "admins gerenciam avaliacoes_fisicas"
  on public.avaliacoes_fisicas for all
  using (public.is_admin())
  with check (public.is_admin());

-- =========================================================================
-- avaliacoes_resumos_paciente — única tabela desta migração com leitura
-- liberada ao paciente, e só quando o nutricionista explicitamente libera.
-- =========================================================================
create table if not exists public.avaliacoes_resumos_paciente (
  id uuid primary key default gen_random_uuid(),
  -- `unique`: no máximo um resumo liberado por avaliação — "disponibilizar"
  -- de novo faz upsert nesta coluna, "revogar" apaga a linha.
  avaliacao_id uuid not null unique references public.avaliacoes_fisicas (id) on delete cascade,
  auth_id uuid not null references auth.users (id) on delete cascade,
  resumo text not null,
  disponibilizado_em timestamptz not null default now()
);

create index if not exists avaliacoes_resumos_paciente_auth_id_idx on public.avaliacoes_resumos_paciente (auth_id);

alter table public.avaliacoes_resumos_paciente enable row level security;

drop policy if exists "admins gerenciam avaliacoes_resumos_paciente" on public.avaliacoes_resumos_paciente;
create policy "admins gerenciam avaliacoes_resumos_paciente"
  on public.avaliacoes_resumos_paciente for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "paciente le proprio resumo liberado" on public.avaliacoes_resumos_paciente;
create policy "paciente le proprio resumo liberado"
  on public.avaliacoes_resumos_paciente for select
  using (auth.uid() = auth_id);

-- =========================================================================
-- Storage bucket para os PDFs do Bodymetrix — sempre privado, sem policy
-- de leitura para o paciente (mesmo raciocínio da tabela avaliacoes_fisicas).
-- =========================================================================
insert into storage.buckets (id, name, public)
values ('avaliacoes', 'avaliacoes', false)
on conflict (id) do nothing;

drop policy if exists "admins gerenciam arquivos de avaliacoes" on storage.objects;
create policy "admins gerenciam arquivos de avaliacoes"
  on storage.objects for all
  using (bucket_id = 'avaliacoes' and public.is_admin())
  with check (bucket_id = 'avaliacoes' and public.is_admin());
