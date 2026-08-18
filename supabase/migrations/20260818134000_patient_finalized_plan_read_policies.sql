-- Permite ao paciente autenticado ler somente a estrutura do próprio plano finalizado.
-- As bibliotecas clínicas continuam fechadas, exceto pelos registros efetivamente usados no plano do usuário.

create policy "paciente le proprio plano estruturado finalizado"
on public.planos_estruturados
for select
to authenticated
using (auth_id = auth.uid() and status = 'finalizado');

create policy "paciente le refeicoes do proprio plano finalizado"
on public.plano_refeicoes
for select
to authenticated
using (
  exists (
    select 1
    from public.planos_estruturados pe
    where pe.id = plano_refeicoes.plano_estruturado_id
      and pe.auth_id = auth.uid()
      and pe.status = 'finalizado'
  )
);

create policy "paciente le itens do proprio plano finalizado"
on public.plano_refeicao_itens
for select
to authenticated
using (
  exists (
    select 1
    from public.plano_refeicoes pr
    join public.planos_estruturados pe on pe.id = pr.plano_estruturado_id
    where pr.id = plano_refeicao_itens.plano_refeicao_id
      and pe.auth_id = auth.uid()
      and pe.status = 'finalizado'
  )
);

create policy "paciente le ingredientes do proprio plano finalizado"
on public.plano_refeicao_item_ingredientes
for select
to authenticated
using (
  exists (
    select 1
    from public.plano_refeicao_itens pri
    join public.plano_refeicoes pr on pr.id = pri.plano_refeicao_id
    join public.planos_estruturados pe on pe.id = pr.plano_estruturado_id
    where pri.id = plano_refeicao_item_ingredientes.plano_refeicao_item_id
      and pe.auth_id = auth.uid()
      and pe.status = 'finalizado'
  )
);

create policy "paciente le receitas usadas no proprio plano finalizado"
on public.receitas
for select
to authenticated
using (
  exists (
    select 1
    from public.plano_refeicao_itens pri
    join public.plano_refeicoes pr on pr.id = pri.plano_refeicao_id
    join public.planos_estruturados pe on pe.id = pr.plano_estruturado_id
    where pri.receita_id = receitas.id
      and pe.auth_id = auth.uid()
      and pe.status = 'finalizado'
  )
);

create policy "paciente le alimentos usados no proprio plano finalizado"
on public.alimentos
for select
to authenticated
using (
  exists (
    select 1
    from public.plano_refeicao_itens pri
    join public.plano_refeicoes pr on pr.id = pri.plano_refeicao_id
    join public.planos_estruturados pe on pe.id = pr.plano_estruturado_id
    where pri.alimento_id = alimentos.id
      and pe.auth_id = auth.uid()
      and pe.status = 'finalizado'
  )
  or exists (
    select 1
    from public.plano_refeicao_item_ingredientes ing
    join public.plano_refeicao_itens pri on pri.id = ing.plano_refeicao_item_id
    join public.plano_refeicoes pr on pr.id = pri.plano_refeicao_id
    join public.planos_estruturados pe on pe.id = pr.plano_estruturado_id
    where ing.alimento_id = alimentos.id
      and pe.auth_id = auth.uid()
      and pe.status = 'finalizado'
  )
);

create policy "paciente le protocolo do proprio plano finalizado"
on public.protocolos
for select
to authenticated
using (
  exists (
    select 1
    from public.planos_estruturados pe
    where pe.protocolo_id = protocolos.id
      and pe.auth_id = auth.uid()
      and pe.status = 'finalizado'
  )
);

-- A função já exige ownership via auth.uid(); acesso anônimo é desnecessário.
revoke execute on function public.substituicoes_ampliadas_plano(uuid) from anon;
