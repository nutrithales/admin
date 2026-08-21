-- Security hardening applied to production Supabase on 2026-08-21.
-- This migration is intentionally idempotent: ALTER FUNCTION SET, REVOKE and GRANT
-- can be replayed safely if a migration runner encounters it later.

-- Harden mutable search_path without changing object resolution semantics.
ALTER FUNCTION public.normalize_legacy_patient_flow_stage() SET search_path = public, pg_temp;
ALTER FUNCTION public.atualizar_observacoes_refeicao_matriz(uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.limpar_substituicoes_observacao_refeicao() SET search_path = public, pg_temp;
ALTER FUNCTION public.treino_set_updated_at() SET search_path = public, pg_temp;
ALTER FUNCTION public.set_exercicios_biblioteca_updated_at() SET search_path = public, pg_temp;

-- Trigger helpers are invoked by PostgreSQL triggers and must not be callable from API roles.
REVOKE EXECUTE ON FUNCTION public.aplicar_protocolo_performance_automatico() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.garantir_grupo_substituicao_pao() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.garantir_modelos_lanche_tarde_protocolo() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.garantir_veg_a_ao_inserir_veg_b() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_diario_pagina_paciente() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_followups_lead_insert_trigger() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_followups_lead_trigger() FROM PUBLIC, anon, authenticated;

-- Internal mutators are only called by trusted trigger/server paths.
REVOKE EXECUTE ON FUNCTION public.recriar_followups_lead(uuid, text, timestamptz) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.preencher_opcoes_refeicao_matriz(uuid, boolean) FROM PUBLIC, anon, authenticated;

-- Patient-facing functions may remain authenticated, but never anonymous.
REVOKE EXECUTE ON FUNCTION public.atualizar_meta_semanal_treino(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.atualizar_meta_semanal_treino(integer) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.lista_vegetais_tipo_a_matriz() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lista_vegetais_tipo_a_matriz() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.lista_vegetais_tipo_b_matriz() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lista_vegetais_tipo_b_matriz() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.listas_vegetais_dashboard_plano(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.listas_vegetais_dashboard_plano(uuid) TO authenticated;

-- Preserve explicit service access for backend operations.
GRANT EXECUTE ON FUNCTION public.aplicar_protocolo_performance_automatico() TO service_role;
GRANT EXECUTE ON FUNCTION public.garantir_grupo_substituicao_pao() TO service_role;
GRANT EXECUTE ON FUNCTION public.garantir_modelos_lanche_tarde_protocolo() TO service_role;
GRANT EXECUTE ON FUNCTION public.garantir_veg_a_ao_inserir_veg_b() TO service_role;
GRANT EXECUTE ON FUNCTION public.sync_diario_pagina_paciente() TO service_role;
GRANT EXECUTE ON FUNCTION public.sync_followups_lead_insert_trigger() TO service_role;
GRANT EXECUTE ON FUNCTION public.sync_followups_lead_trigger() TO service_role;
GRANT EXECUTE ON FUNCTION public.recriar_followups_lead(uuid, text, timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION public.preencher_opcoes_refeicao_matriz(uuid, boolean) TO service_role;
