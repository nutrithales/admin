import "server-only";
import { createClient } from "@/lib/supabase/server";

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

export async function getPlanoAlimentarPacienteAtual(): Promise<PacientePlanoDashboard | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: paciente }, { data: plano }] = await Promise.all([
    supabase.from("pacientes").select("id, nome").eq("auth_id", user.id).maybeSingle(),
    supabase
      .from("planos_estruturados")
      .select("id, titulo, observacoes, meta_kcal, meta_proteina_g, meta_carboidrato_g, meta_gordura_g, protocolo_id, status, created_at")
      .eq("auth_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (!paciente || !plano) return null;

  const [{ data: protocolo }, { data: refeicoes }] = await Promise.all([
    plano.protocolo_id
      ? supabase.from("protocolos").select("nome").eq("id", plano.protocolo_id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from("plano_refeicoes")
      .select(`id, nome, ordem, observacoes,
        itens:plano_refeicao_itens(
          id, ordem, quantidade_g, opcao_numero, opcao_nome, papel_macro, grupo_substituicao_id,
          alimento:alimentos(id, nome),
          receita:receitas(id, nome),
          ingredientes:plano_refeicao_item_ingredientes(quantidade_g_final, ordem, alimento:alimentos(id, nome))
        )`)
      .eq("plano_estruturado_id", plano.id)
      .order("ordem", { ascending: true }),
  ]);

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

  const refeicoesFormatadas: PacientePlanoRefeicao[] = (refeicoes ?? []).map((refeicao) => {
    const grupos = new Map<number, PacientePlanoOpcao>();
    const itens = [...(refeicao.itens ?? [])].sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0));

    for (const item of itens) {
      const numero = item.opcao_numero ?? 1;
      const atual = grupos.get(numero) ?? { numero, nome: item.opcao_nome, itens: [] };
      const tipoA = item.papel_macro === "livre";
      const tipoB = item.papel_macro === "vegetal_b";
      const alimento = item.alimento as unknown as { id: string; nome: string } | null;
      const receita = item.receita as unknown as { id: string; nome: string } | null;
      const ingredientes = (item.ingredientes ?? []) as unknown as Array<{
        quantidade_g_final: number;
        ordem: number | null;
        alimento: { id: string; nome: string };
      }>;

      atual.itens.push({
        id: item.id,
        nome: tipoA ? "Vegetais Tipo A" : tipoB ? "Vegetais Tipo B" : receita?.nome ?? alimento?.nome ?? "Item",
        quantidadeTexto: tipoA ? "livre" : tipoB ? "1 porção" : undefined,
        quantidadeG: !tipoA && !tipoB && alimento ? Number(item.quantidade_g ?? 0) || undefined : undefined,
        papelMacro: item.papel_macro,
        grupoSubstituicaoId: item.grupo_substituicao_id,
        ingredientes: receita
          ? ingredientes
              .sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0))
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
    pacienteNome: paciente.nome,
    protocoloNome: protocolo?.nome ?? null,
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
