import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { createClient as createServiceClient, type SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { SUPABASE_URL } from "@/lib/supabase/config";
import { assertAdmin } from "@/lib/supabase/assert-admin";
import { adaptivePace, blockTargets, brasilDate, type RunningData } from "@/lib/running/core";
import { calendarEntries, renderCalendar } from "@/lib/running/calendar";

export type CalendarStatus = { active: boolean; expires: string | null; lastFetched: string | null };
export const calendarDigest = (value: string) => createHash("sha256").update(value).digest("hex");
// Not a general-purpose privileged client: callers below must first authenticate an
// owning patient/admin OR verify the high-entropy bearer token before loading a plan.
function storage(): SupabaseClient {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("Serviço de calendário indisponível.");
  return createServiceClient(SUPABASE_URL, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
async function authorizedPatient(adminPatientId?: string) {
  if (adminPatientId) await assertAdmin();
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) throw new Error("Entre novamente para configurar o envio.");
  const query = sb.from("pacientes").select("id");
  const { data, error } = await (adminPatientId ? query.eq("id", adminPatientId) : query.eq("auth_id", user.id)).maybeSingle();
  if (error || !data) throw new Error("Cadastro não encontrado.");
  return data.id;
}
export async function getCalendarStatus(adminPatientId?: string): Promise<CalendarStatus> {
  const id = await authorizedPatient(adminPatientId);
  const { data, error } = await storage().from("corrida_calendarios").select("ativo,expira_em,ultimo_acesso_em").eq("paciente_id", id).maybeSingle();
  if (error) throw new Error("Não foi possível carregar o calendário.");
  return { active: !!data?.ativo && data.expira_em > new Date().toISOString(), expires: data?.expira_em ?? null, lastFetched: data?.ultimo_acesso_em ?? null };
}
export async function issueCalendarLink(consent: boolean, rotate: boolean) {
  if (!consent) throw new Error("Confirme o compartilhamento dos treinos para gerar o link.");
  const id = await authorizedPatient();
  const sb = storage();
  const { data: previous, error: previousError } = await sb.from("corrida_calendarios").select("ativo,expira_em,token_hash").eq("paciente_id", id).maybeSingle();
  if (previousError) throw new Error("Não foi possível verificar o link atual.");
  if (previous?.ativo && previous.expira_em > new Date().toISOString() && !rotate) throw new Error("Já existe um link ativo. Confirme a troca para invalidar o anterior.");
  const { data: cycles, error: cError } = await sb.from("corrida_ciclos").select("id").eq("paciente_id", id).eq("ativo", true).limit(1);
  if (cError || !cycles?.length) throw new Error("Você ainda não possui um plano de corrida ativo.");
  const token = randomBytes(32).toString("base64url");
  const now = new Date(); const expires = new Date(now.getTime() + 180 * 86400000).toISOString();
  const values = { paciente_id: id, token_hash: calendarDigest(token), ativo: true, consentido_em: now.toISOString(), criado_em: now.toISOString(), expira_em: expires, ultimo_acesso_em: null, revisao: 0, conteudo_hash: null, atualizado_em: now.toISOString() };
  const { data: written, error } = await (previous ? sb.from("corrida_calendarios").update(values).eq("paciente_id", id).eq("token_hash", previous.token_hash) : sb.from("corrida_calendarios").insert(values)).select("paciente_id").maybeSingle();
  if (error || !written) throw new Error("Não foi possível gerar o link. Recarregue para conferir se já existe um link ativo.");
  // A fixed deployed origin prevents forwarded-host/header injection in private links.
  return { url: `https://admin-nutri-thales.vercel.app/api/corrida/calendario/${token}`, expires };
}
export async function disableCalendarLink() {
  const id = await authorizedPatient();
  const { error } = await storage().from("corrida_calendarios").update({ ativo: false }).eq("paciente_id", id);
  if (error) throw new Error("Não foi possível desativar o link.");
}

export async function readPrivateCalendar(token: string) {
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
  const sb = storage();
  const hash = calendarDigest(token);
  const { data: feed, error } = await sb.from("corrida_calendarios").select("paciente_id,ativo,expira_em,revisao,conteudo_hash,atualizado_em").eq("token_hash", hash).maybeSingle();
  if (error) throw new Error("Falha ao carregar calendário.");
  const now = new Date().toISOString();
  if (!feed?.ativo || feed.expira_em <= now) return null;
  const today = brasilDate();
  // Service role bypasses RLS: owner, active status AND release date are explicitly
  // enforced here; future prescription content is never queried for this public feed.
  const { data: cycles, error: cError } = await sb.from("corrida_ciclos").select("*").eq("paciente_id", feed.paciente_id).eq("ativo", true).lte("liberar_em", today).order("mes");
  if (cError) throw new Error("Falha ao carregar ciclos.");
  const ids = (cycles ?? []).map(c => c.id);
  const [{ data: workouts, error: wError }, { data: records, error: rError }] = ids.length ? await Promise.all([
    sb.from("corrida_treinos").select("*").in("ciclo_id", ids).order("data_planejada").order("ordem"),
    sb.from("corrida_registros").select("*").eq("paciente_id", feed.paciente_id),
  ]) : [{ data: [], error: null }, { data: [], error: null }];
  if (wError || rError) throw new Error("Falha ao carregar treinos.");
  const data = { patientName: "", today, cycles: cycles ?? [], workouts: workouts ?? [], records: records ?? [] } as RunningData;
  const eligible = data.workouts.filter(w => data.cycles.some(c => c.id === w.ciclo_id && c.pace_automatico));
  const offset = adaptivePace(eligible, data.records, today).seconds;
  const entries = calendarEntries(data, w => blockTargets(w, data.records.find(r => r.treino_id === w.id), data.cycles.find(c => c.id === w.ciclo_id)?.pace_automatico ? offset : 0, today));
  const contentHash = calendarDigest(JSON.stringify(entries));
  let revision = feed.revisao as number; let modifiedAt = feed.atualizado_em as string;
  if (contentHash !== feed.conteudo_hash) {
    const { data: updated, error: updateError } = await sb.from("corrida_calendarios").update({ revisao: revision + 1, conteudo_hash: contentHash, atualizado_em: now }).eq("token_hash", hash).eq("ativo", true).eq("revisao", revision).select("revisao,atualizado_em").maybeSingle();
    if (updateError) throw new Error("Falha ao atualizar calendário.");
    if (updated) { revision = updated.revisao; modifiedAt = updated.atualizado_em; }
    else {
      const { data: fresh } = await sb.from("corrida_calendarios").select("ativo,conteudo_hash,revisao,atualizado_em").eq("token_hash", hash).maybeSingle();
      if (!fresh?.ativo) return null;
      if (fresh.conteudo_hash !== contentHash) throw new Error("Atualização concorrente. Tente novamente.");
      revision = fresh.revisao; modifiedAt = fresh.atualizado_em;
    }
  }
  // A fetch proves only that the private link was read, not that a watch synced.
  const { data: active, error: accessError } = await sb.from("corrida_calendarios").update({ ultimo_acesso_em: now }).eq("token_hash", hash).eq("ativo", true).gt("expira_em", now).select("paciente_id").maybeSingle();
  if (accessError) throw new Error("Falha ao confirmar acesso.");
  if (!active) return null;
  return renderCalendar(entries, revision, modifiedAt);
}
