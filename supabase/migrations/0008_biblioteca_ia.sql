-- Nutri Thales Rosa — Biblioteca de conhecimento por IA
--
-- Ingestão multi-formato (PDF/DOCX/HTML/TXT/imagem) que alimenta a biblioteca
-- já existente (alimentos, receitas) automaticamente. Diferente das outras
-- funções de IA do sistema (que nunca inventam alimento/receita fora da
-- biblioteca já cadastrada), aqui a IA PODE criar um alimento ou receita
-- novo sozinha — mas sempre marcado `revisado_manualmente = false`, numa
-- fila de revisão, nunca como um dado silenciosamente "confiável" desde o
-- início. Só ADICIONA — nunca renomeia/remove nada existente.

-- =========================================================================
-- documentos_biblioteca — registro de cada documento importado.
-- =========================================================================
create table if not exists public.documentos_biblioteca (
  id uuid primary key default gen_random_uuid(),
  nome_arquivo text not null,
  tipo_arquivo text not null, -- pdf | docx | html | txt | imagem
  bucket text not null default 'biblioteca-documentos',
  path text,
  -- null = material de referência geral (não ligado a um paciente
  -- específico); preenchido = documento de um paciente (plano antigo etc.),
  -- mesmo padrão de `planos_estruturados.auth_id` (liga por auth_id, não
  -- FK direta pra pacientes.id).
  auth_id uuid references auth.users (id) on delete set null,
  -- 'concluido'/'erro' nesta fase (processamento é síncrono); a coluna já
  -- fica pronta pra 'pendente'/'processando' no dia que virar assíncrono.
  status text not null default 'concluido',
  -- contagens do que a extração encontrou/criou: alimentos_novos,
  -- receitas_novas, refeicoes_reconhecidas, itens_prontuario etc.
  resumo_extracao jsonb not null default '{}'::jsonb,
  erro_mensagem text,
  created_at timestamptz not null default now()
);

create index if not exists documentos_biblioteca_auth_id_idx on public.documentos_biblioteca (auth_id);

alter table public.documentos_biblioteca enable row level security;

drop policy if exists "admins gerenciam documentos_biblioteca" on public.documentos_biblioteca;
create policy "admins gerenciam documentos_biblioteca"
  on public.documentos_biblioteca for all
  using (public.is_admin())
  with check (public.is_admin());

-- =========================================================================
-- alimentos: sinônimos (só pra busca/casamento, nunca some com o macro
-- específico de cada preparo) + fila de revisão.
-- =========================================================================
alter table public.alimentos add column if not exists sinonimos text[] not null default '{}';
alter table public.alimentos add column if not exists revisado_manualmente boolean not null default true;

-- índice GIN simples (array de texto, sem trigram) — suficiente pra
-- containment/overlap (`@>`/`&&`); busca fuzzy nos sinônimos fica pra
-- quando a Fase 4 (busca inteligente) precisar de fato.
create index if not exists alimentos_sinonimos_idx on public.alimentos using gin (sinonimos);

-- =========================================================================
-- receitas: mesma fila de revisão.
-- =========================================================================
alter table public.receitas add column if not exists revisado_manualmente boolean not null default true;

-- =========================================================================
-- Storage bucket para os documentos importados — admin-only, mesmo
-- raciocínio de `avaliacoes` (pode conter material clínico de paciente).
-- =========================================================================
insert into storage.buckets (id, name, public)
values ('biblioteca-documentos', 'biblioteca-documentos', false)
on conflict (id) do nothing;

drop policy if exists "admins gerenciam arquivos de biblioteca_documentos" on storage.objects;
create policy "admins gerenciam arquivos de biblioteca_documentos"
  on storage.objects for all
  using (bucket_id = 'biblioteca-documentos' and public.is_admin())
  with check (bucket_id = 'biblioteca-documentos' and public.is_admin());
