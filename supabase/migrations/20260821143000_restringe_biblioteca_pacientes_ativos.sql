-- Biblioteca global: somente pacientes ativos podem ler conteúdos publicados.
-- Administradores continuam cobertos pelas políticas administrativas existentes.

drop policy if exists "paciente le biblioteca ativa" on public.biblioteca;
create policy "paciente le biblioteca ativa"
  on public.biblioteca for select
  using (
    ativo = true
    and auth.role() = 'authenticated'
    and exists (
      select 1
      from public.pacientes p
      where p.auth_id = auth.uid()
        and lower(coalesce(p.status, '')) = 'ativo'
    )
  );

drop policy if exists "paciente le arquivos de biblioteca ativos" on storage.objects;
create policy "paciente le arquivos de biblioteca ativos"
  on storage.objects for select
  using (
    bucket_id = 'biblioteca'
    and auth.role() = 'authenticated'
    and exists (
      select 1
      from public.pacientes p
      where p.auth_id = auth.uid()
        and lower(coalesce(p.status, '')) = 'ativo'
    )
    and exists (
      select 1
      from public.biblioteca b
      where b.path = storage.objects.name
        and b.ativo = true
    )
  );
