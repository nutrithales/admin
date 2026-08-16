-- Estas funções são infraestrutura interna dos triggers da Biblioteca Clínica.
-- Não devem ficar expostas como RPC para anon/authenticated.
revoke execute on function public.quantidade_equivalente_grupo(uuid,uuid,numeric,uuid) from public, anon, authenticated;
revoke execute on function public.preencher_refeicao_clinica_v1() from public, anon, authenticated;
revoke execute on function public.ajustar_quantidade_substituicao_clinica_v1() from public, anon, authenticated;
