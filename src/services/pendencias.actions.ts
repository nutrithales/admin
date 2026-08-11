"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { assertAdmin } from "@/lib/supabase/assert-admin";
import { assertAdminComNivel } from "@/lib/supabase/assert-permission";
import { detectarPendencias } from "@/lib/clara/pendencias-engine";
import type { ActionResult } from "@/services/pacientes.actions";

function chaveCandidata(c: { tipo: string; pacienteId: string | null; tarefaId?: string | null }) {
  return `${c.tipo}::${c.pacienteId ?? ""}::${c.tarefaId ?? ""}`;
}

/** Recalcula a central de pendências a partir do estado real do banco:
 * resolve automaticamente o que não se aplica mais, reabre pendências
 * adiadas cujo prazo passou e cria as novas. Nunca decide nada clínico —
 * só espelha condições administrativas (agenda, plano, check-in, Fluxo,
 * pagamento, tarefas). Chamada a cada carregamento da página da Clara e
 * depois de ações que mudam o estado (concluir consulta, mover no Fluxo,
 * registrar pagamento, etc.). */
export async function syncPendencias(): Promise<void> {
  await assertAdmin();
  const supabase = await createClient();

  const [
    { data: pacientes },
    { data: consultas },
    { data: checkins },
    { data: pagamentos },
    { data: tarefas },
    { data: movimentacoes },
    { data: pendenciasAtivas },
  ] = await Promise.all([
    supabase.from("pacientes").select("*"),
    supabase.from("consultas").select("*"),
    supabase.from("checkins").select("*"),
    supabase.from("pagamentos").select("*"),
    supabase.from("tarefas").select("*"),
    supabase
      .from("fluxo_movimentacoes")
      .select("paciente_id, created_at")
      .order("created_at", { ascending: false }),
    supabase.from("pendencias").select("*").neq("status", "resolvida"),
  ]);

  const ultimaMovimentacaoPorPaciente = new Map<string, string>();
  for (const mov of movimentacoes ?? []) {
    if (!ultimaMovimentacaoPorPaciente.has(mov.paciente_id)) {
      ultimaMovimentacaoPorPaciente.set(mov.paciente_id, mov.created_at);
    }
  }

  const candidatas = detectarPendencias({
    pacientes: pacientes ?? [],
    consultas: consultas ?? [],
    checkins: checkins ?? [],
    pagamentos: pagamentos ?? [],
    tarefas: tarefas ?? [],
    ultimaMovimentacaoPorPaciente,
  });

  const candidatasPorChave = new Map(candidatas.map((c) => [chaveCandidata(c), c]));
  const hojeIso = new Date().toISOString().slice(0, 10);

  const idsParaResolver: string[] = [];
  const idsParaReabrir: string[] = [];
  const chavesExistentes = new Set<string>();

  for (const ativa of pendenciasAtivas ?? []) {
    const k = chaveCandidata({ tipo: ativa.tipo, pacienteId: ativa.paciente_id, tarefaId: ativa.tarefa_id });
    chavesExistentes.add(k);
    if (!candidatasPorChave.has(k)) {
      idsParaResolver.push(ativa.id);
    } else if (ativa.status === "adiada" && ativa.adiada_ate && ativa.adiada_ate < hojeIso) {
      idsParaReabrir.push(ativa.id);
    }
  }

  const paraInserir = candidatas.filter((c) => !chavesExistentes.has(chaveCandidata(c)));

  await Promise.all([
    idsParaResolver.length
      ? supabase
          .from("pendencias")
          .update({ status: "resolvida", resolvida_em: new Date().toISOString() })
          .in("id", idsParaResolver)
      : null,
    idsParaReabrir.length
      ? supabase.from("pendencias").update({ status: "pendente" }).in("id", idsParaReabrir)
      : null,
    paraInserir.length
      ? supabase.from("pendencias").insert(
          paraInserir.map((c) => ({
            tipo: c.tipo,
            paciente_id: c.pacienteId,
            tarefa_id: c.tarefaId ?? null,
            consulta_id: c.consultaId ?? null,
            motivo: c.motivo,
            prioridade: c.prioridade,
            prazo: c.prazo ?? null,
          })),
        )
      : null,
  ]);
}

export async function resolverPendenciaAction(id: string): Promise<ActionResult> {
  const { adminId } = await assertAdminComNivel();
  const supabase = await createClient();
  const { error } = await supabase
    .from("pendencias")
    .update({ status: "resolvida", resolvida_em: new Date().toISOString(), resolvida_por: adminId })
    .eq("id", id);
  if (error) return { success: false, message: `Erro ao resolver pendência: ${error.message}` };

  revalidatePath("/clara");
  return { success: true, message: "Pendência resolvida." };
}

export async function adiarPendenciaAction(id: string, ateIso: string): Promise<ActionResult> {
  await assertAdmin();
  const supabase = await createClient();
  const { error } = await supabase
    .from("pendencias")
    .update({ status: "adiada", adiada_ate: ateIso })
    .eq("id", id);
  if (error) return { success: false, message: `Erro ao adiar pendência: ${error.message}` };

  revalidatePath("/clara");
  return { success: true, message: "Pendência adiada." };
}
