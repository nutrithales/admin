-- O grant padrão de funções pode vir de PUBLIC; revogar somente anon não remove esse acesso herdado.
revoke execute on function public.substituicoes_ampliadas_plano(uuid) from public;
grant execute on function public.substituicoes_ampliadas_plano(uuid) to authenticated;
grant execute on function public.substituicoes_ampliadas_plano(uuid) to service_role;
