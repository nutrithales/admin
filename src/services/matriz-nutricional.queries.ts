import "server-only";
import { createClient } from "@/lib/supabase/server";

export interface MatrizPacienteOption {
  authId: string;
  nome: string;
  pesoKg: number | null;
  alturaCm: number | null;
  objetivo: string | null;
  nivelAtividade: string | null;
  treinoFrequenciaSemanal: number | null;
  dataNascimento: string | null;
  restricoesAlimentares: string[];
  preferenciasAlimentares: string | null;
  avaliacao: {
    data: string;
    pesoKg: number | null;
    alturaCm: number | null;
    percentualGordura: number | null;
    massaMagraKg: number | null;
    massaGordaKg: number | null;
  } | null;
}

export interface MatrizProtocoloOption {
  id: string;
  nome: string;
  numeroRefeicoes: number;
}

export async function listDadosMatrizNutricional(): Promise<{
  pacientes: MatrizPacienteOption[];
  matrizes: MatrizProtocoloOption[];
}> {
  const supabase = await createClient();

  const [{ data: pacientes, error: pacientesError }, { data: avaliacoes, error: avaliacoesError }, { data: protocolos, error: protocolosError }] =
    await Promise.all([
      supabase
        .from("pacientes")
        .select(
          "auth_id, nome, peso_kg, altura_cm, objetivo, nivel_atividade, treino_frequencia_semanal, data_nascimento, restricoes_alimentares, preferencias_alimentares",
        )
        .neq("status", "inativo")
        .order("nome", { ascending: true }),
      supabase
        .from("avaliacoes_fisicas")
        .select("auth_id, data, peso_kg, altura_cm, percentual_gordura, massa_magra_kg, massa_gorda_kg")
        .order("data", { ascending: false }),
      supabase
        .from("protocolos")
        .select("id, nome, refeicoes:protocolo_refeicoes(id)")
        .eq("ativo", true)
        .like("nome", "Matriz NTR —%")
        .order("nome", { ascending: true }),
    ]);

  if (pacientesError) throw new Error(`Erro ao carregar pacientes: ${pacientesError.message}`);
  if (avaliacoesError) throw new Error(`Erro ao carregar avaliações: ${avaliacoesError.message}`);
  if (protocolosError) throw new Error(`Erro ao carregar matrizes: ${protocolosError.message}`);

  const avaliacaoMaisRecente = new Map<string, NonNullable<typeof avaliacoes>[number]>();
  for (const avaliacao of avaliacoes ?? []) {
    if (!avaliacaoMaisRecente.has(avaliacao.auth_id)) {
      avaliacaoMaisRecente.set(avaliacao.auth_id, avaliacao);
    }
  }

  return {
    pacientes: (pacientes ?? []).map((paciente) => {
      const avaliacao = avaliacaoMaisRecente.get(paciente.auth_id);
      return {
        authId: paciente.auth_id,
        nome: paciente.nome ?? "(sem nome)",
        pesoKg: paciente.peso_kg,
        alturaCm: paciente.altura_cm,
        objetivo: paciente.objetivo,
        nivelAtividade: paciente.nivel_atividade,
        treinoFrequenciaSemanal: paciente.treino_frequencia_semanal,
        dataNascimento: paciente.data_nascimento,
        restricoesAlimentares: paciente.restricoes_alimentares ?? [],
        preferenciasAlimentares: paciente.preferencias_alimentares,
        avaliacao: avaliacao
          ? {
              data: avaliacao.data,
              pesoKg: avaliacao.peso_kg,
              alturaCm: avaliacao.altura_cm,
              percentualGordura: avaliacao.percentual_gordura,
              massaMagraKg: avaliacao.massa_magra_kg,
              massaGordaKg: avaliacao.massa_gorda_kg,
            }
          : null,
      };
    }),
    matrizes: (protocolos ?? []).map((protocolo) => ({
      id: protocolo.id,
      nome: protocolo.nome,
      numeroRefeicoes: protocolo.refeicoes?.length ?? 0,
    })),
  };
}
