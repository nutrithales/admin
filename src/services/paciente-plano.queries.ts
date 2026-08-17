import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getPlanoEstruturado } from "@/services/planos-estruturados.queries";

export interface PacientePlanoSubstituicao {
  itemId: string;
  grupo: string;
  nome: string;
  quantidadeG: number;
}

export interface PacientePlanoItem {
  id: string;
  nome: string;
  quantidadeG?: number;
  quantidadeTexto?: string;
  papelMacro?: string | null;
  grupoSubstituicaoId?: string | null;
  ingredientes?: { nome: string; quantidadeG: number }[];
}

export interface PacientePlanoOpcao {
  numero: number;
  nome?: string | null;
  itens: PacientePlanoItem[];
}

export interface PacientePlanoRefeicao {
  id: string;
  nome: string;
  ordem: number;
  observacoes?: string | null;
  opcoes: PacientePlanoOpcao[];
}

export interface PacientePlanoDashboard {
  id: string;
  titulo: string;
  pacienteNome: string;
  protocoloNome?: string | null;
  observacoes?: string | null;
  metas: {
    kcal?: number | null;
    proteinaG?: number | null;
    carboidratoG?: number | null;
    gorduraG?: number | null;
  };
  refeicoes: PacientePlanoRefeicao[];
  substituicoes: PacientePlanoSubstituicao[];
}

interface RpcSubRow {
  item_id: string;
  grupo_nome: string;
  alimento_substituto_nome: string;
  quantidade_substituto_g: number;
}

async function montarDashboardPlano(planoId: string): Promise<PacientePlanoDashboard | null> {
  const supabase = await createClient();
  const plano = await getPlanoEstruturado(planoId);
  if (!plano) return null;

  const { data: paciente } = await supabase
    .from("pacientes")
    .select("id, nome")
    .eq("auth_id", plano.auth_id)
    .maybeSingle();

  const rpcClient = supabase as unknown as {
    rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>;
  };
  const { data: subData } = await rpcClient.rpc("substituicoes_ampliadas_plano", { p_plano_id: plano.id });
  const substituicoes: PacientePlanoSubstituicao[] = ((subData ?? []) as RpcSubRow[]).map((row) => ({
    itemId: row.item_id,
    grupo: row.grupo_nome,
    nome: row.alimento_substituto_nome,
    quantidadeG: Number(row.quantidade_substituto_g),
  }));

  const refeicoesFormatadas: PacientePlanoRefeicao[] = [...plano.refeicoes]
    .sort((a, b) => a.ordem - b.ordem)
    .map((refeicao) => {
      const grupos = new Map<number, PacientePlanoOpcao>();
      const itens = [...refeicao.itens].sort((a, b) => a.ordem - b.ordem);

      for (const item of itens) {
        const numero = item.opcao_numero ?? 1;
        const atual: PacientePlanoOpcao = grupos.get(numero) ?? { numero, nome: item.opcao_nome ?? null, itens: [] };
        const tipoA = item.papel_macro === "livre";
        const tipoB = item.papel_macro === "vegetal_b";

        atual.itens.push({
          id: item.id,
          nome: tipoA ? "Vegetais Tipo A" : tipoB ? "Vegetais Tipo B" : item.receita?.nome ?? item.alimento?.nome ?? "Item",
          quantidadeTexto: tipoA ? "livre" : tipoB ? "1 porção" : undefined,
          quantidadeG: !tipoA && !tipoB && item.alimento ? Number(item.quantidade_g ?? 0) || undefined : undefined,
          papelMacro: item.papel_macro,
          grupoSubstituicaoId: item.grupo_substituicao_id,
          ingredientes: item.receita
            ? [...item.ingredientes]
                .sort((a, b) => a.ordem - b.ordem)
                .map((ing) => ({ nome: ing.alimento.nome, quantidadeG: Number(ing.quantidade_g_final) }))
            : undefined,
        });
        grupos.set(numero, atual);
      }

      return {
        id: refeicao.id,
        nome: refeicao.nome,
        ordem: refeicao.ordem,
        observacoes: refeicao.observacoes,
        opcoes: [...grupos.values()].sort((a, b) => a.numero - b.numero),
      };
    });

  return {
    id: plano.id,
    titulo: plano.titulo || "Plano alimentar",
    pacienteNome: paciente?.nome || "Paciente",
    protocoloNome: plano.protocolo?.nome ?? null,
    observacoes: plano.observacoes,
    metas: {
      kcal: plano.meta_kcal,
      proteinaG: plano.meta_proteina_g,
      carboidratoG: plano.meta_carboidrato_g,
      gorduraG: plano.meta_gordura_g,
    },
    refeicoes: refeicoesFormatadas,
    substituicoes,
  };
}

export async function getPlanoAlimentarDashboardPorId(planoId: string): Promise<PacientePlanoDashboard | null> {
  return montarDashboardPlano(planoId);
}

export async function getPlanoAlimentarPacienteAtual(): Promise<PacientePlanoDashboard | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: paciente }, { data: planoResumo }] = await Promise.all([
    supabase.from("pacientes").select("id, nome").eq("auth_id", user.id).maybeSingle(),
    supabase
      .from("planos_estruturados")
      .select("id")
      .eq("auth_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (!paciente || !planoResumo) return null;

  const plano = await getPlanoEstruturado(planoResumo.id);
  if (!plano || plano.auth_id !== user.id) return null;

  return montarDashboardPlano(plano.id);
}
