import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getPlanoEstruturado } from "@/services/planos-estruturados.queries";

export interface PacientePlanoSubstituicao {
  itemId: string;
  grupo: string;
  nome: string;
  quantidadeG: number;
  medidaCaseira?: string | null;
}

export interface PacientePlanoVegetal {
  nome: string;
  porcaoG?: number | null;
}

export interface PacientePlanoItem {
  id: string;
  nome: string;
  quantidadeG?: number;
  quantidadeTexto?: string;
  medidaCaseira?: string | null;
  papelMacro?: string | null;
  grupoSubstituicaoId?: string | null;
  ingredientes?: { nome: string; quantidadeG: number; medidaCaseira?: string | null }[];
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
  vegetais?: {
    tipoA: PacientePlanoVegetal[];
    tipoB: PacientePlanoVegetal[];
  };
}

type Medida = {
  peso_g?: number;
  unidade?: string;
  gramas?: number;
  nome?: string;
};

function normalizarMedida(m: Medida): { pesoG: number; unidade: string } | null {
  const pesoG = Number(m?.peso_g ?? m?.gramas);
  const unidade = m?.unidade ?? m?.nome;
  if (!(pesoG > 0) || typeof unidade !== "string" || !unidade.trim()) return null;
  return { pesoG, unidade: unidade.trim() };
}

function medidaCaseira(medidas: unknown, quantidadeG?: number | null): string | null {
  if (!quantidadeG || !Array.isArray(medidas) || medidas.length === 0) return null;
  const validas = (medidas as Medida[]).map(normalizarMedida).filter((m): m is { pesoG: number; unidade: string } => Boolean(m));
  if (!validas.length) return null;

  const pontuadas = validas.map((m) => {
    const unidades = quantidadeG / m.pesoG;
    const arred05 = Math.round(unidades * 2) / 2;
    const erro = Math.abs(unidades - arred05);
    const faixa = arred05 >= 0.5 && arred05 <= 8 ? 0 : 1;
    return { ...m, arred05, score: faixa * 10 + erro };
  }).sort((a, b) => a.score - b.score);

  const melhor = pontuadas[0];
  if (!melhor || melhor.arred05 <= 0) return null;
  const qtd = melhor.arred05.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
  return `≈ ${qtd} ${melhor.unidade.toLowerCase()}`;
}

function prioridadeRefeicaoPaciente(nome: string): number {
  const normalizado = nome.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  return normalizado.includes("pre-treino") || normalizado.includes("pre treino") ? 0 : 1;
}

function prioridadeItemPaciente(item: PacientePlanoItem): number {
  if (item.papelMacro === "livre") return 80;
  if (item.papelMacro === "vegetal_b") return 90;
  return 10;
}

interface RpcSubRow {
  item_id: string;
  grupo_nome: string;
  alimento_substituto_nome: string;
  quantidade_substituto_g: number;
  medidas_caseiras?: unknown;
}

interface RpcVegetalRow {
  tipo: "VEG_A" | "VEG_B";
  nome: string;
  porcao_g: number | null;
  ordem: number;
}

async function montarDashboardPlano(planoId: string): Promise<PacientePlanoDashboard | null> {
  const supabase = await createClient();
  const plano = await getPlanoEstruturado(planoId);
  if (!plano) return null;

  const { data: paciente } = await supabase.from("pacientes").select("id, nome").eq("auth_id", plano.auth_id).maybeSingle();

  const rpcClient = supabase as unknown as {
    rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>;
  };

  const [{ data: subData }, { data: vegetalData }] = await Promise.all([
    rpcClient.rpc("substituicoes_ampliadas_plano", { p_plano_id: plano.id }),
    rpcClient.rpc("listas_vegetais_dashboard_plano", { p_plano_id: plano.id }),
  ]);

  const substituicoes: PacientePlanoSubstituicao[] = ((subData ?? []) as RpcSubRow[]).map((row) => {
    const quantidadeG = Number(row.quantidade_substituto_g);
    return {
      itemId: row.item_id,
      grupo: row.grupo_nome,
      nome: row.alimento_substituto_nome,
      quantidadeG,
      medidaCaseira: medidaCaseira(row.medidas_caseiras, quantidadeG),
    };
  });

  const vegetaisRows = ((vegetalData ?? []) as RpcVegetalRow[]).sort((a, b) => a.ordem - b.ordem);
  const vegetais = {
    tipoA: vegetaisRows.filter((row) => row.tipo === "VEG_A").map((row) => ({ nome: row.nome, porcaoG: null })),
    tipoB: vegetaisRows.filter((row) => row.tipo === "VEG_B").map((row) => ({ nome: row.nome, porcaoG: row.porcao_g == null ? null : Number(row.porcao_g) })),
  };

  const refeicoesFormatadas: PacientePlanoRefeicao[] = [...plano.refeicoes].sort((a, b) => {
    const prioridade = prioridadeRefeicaoPaciente(a.nome) - prioridadeRefeicaoPaciente(b.nome);
    return prioridade !== 0 ? prioridade : a.ordem - b.ordem;
  }).map((refeicao) => {
    const grupos = new Map<number, PacientePlanoOpcao>();
    const itens = [...refeicao.itens].sort((a, b) => a.ordem - b.ordem);

    for (const item of itens) {
      const numero = item.opcao_numero ?? 1;
      const atual: PacientePlanoOpcao = grupos.get(numero) ?? { numero, nome: item.opcao_nome ?? null, itens: [] };
      const tipoA = item.papel_macro === "livre";
      const tipoB = item.papel_macro === "vegetal_b";
      const quantidadeG = !tipoA && !tipoB && item.alimento ? Number(item.quantidade_g ?? 0) || undefined : undefined;

      atual.itens.push({
        id: item.id,
        nome: tipoA ? "Vegetais Tipo A" : tipoB ? "Vegetais Tipo B" : item.receita?.nome ?? item.alimento?.nome ?? "Item",
        quantidadeTexto: tipoA ? "livre" : tipoB ? "1 porção" : undefined,
        quantidadeG,
        medidaCaseira: item.alimento ? medidaCaseira(item.alimento.medidas_caseiras, quantidadeG) : null,
        papelMacro: item.papel_macro,
        grupoSubstituicaoId: item.grupo_substituicao_id,
        ingredientes: item.receita
          ? [...item.ingredientes].sort((a, b) => a.ordem - b.ordem).map((ing) => {
              const q = Number(ing.quantidade_g_final);
              return { nome: ing.alimento.nome, quantidadeG: q, medidaCaseira: medidaCaseira(ing.alimento.medidas_caseiras, q) };
            })
          : undefined,
      });
      grupos.set(numero, atual);
    }

    const opcoes = [...grupos.values()].sort((a, b) => a.numero - b.numero).map((opcao) => ({
      ...opcao,
      itens: [...opcao.itens].sort((a, b) => prioridadeItemPaciente(a) - prioridadeItemPaciente(b)),
    }));

    return { id: refeicao.id, nome: refeicao.nome, ordem: refeicao.ordem, observacoes: refeicao.observacoes, opcoes };
  });

  return {
    id: plano.id,
    titulo: plano.titulo || "Plano alimentar",
    pacienteNome: paciente?.nome || "Paciente",
    protocoloNome: plano.protocolo?.nome ?? null,
    observacoes: plano.observacoes,
    metas: { kcal: plano.meta_kcal, proteinaG: plano.meta_proteina_g, carboidratoG: plano.meta_carboidrato_g, gorduraG: plano.meta_gordura_g },
    refeicoes: refeicoesFormatadas,
    substituicoes,
    vegetais,
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
    supabase.from("planos_estruturados").select("id").eq("auth_id", user.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
  ]);

  if (!paciente || !planoResumo) return null;
  const plano = await getPlanoEstruturado(planoResumo.id);
  if (!plano || plano.auth_id !== user.id) return null;
  return montarDashboardPlano(plano.id);
}
