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
  sexoBiologico: "masculino" | "feminino" | null;
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

  const pacientesQuery = supabase.from("pacientes") as unknown as {
    select: (columns: string) => {
      neq: (column: string, value: string) => {
        order: (column: string, options: { ascending: boolean }) => Promise<{
          data: Array<{
            auth_id: string;
            nome: string | null;
            peso_kg: number | null;
            altura_cm: number | null;
            objetivo: string | null;
            nivel_atividade: string | null;
            treino_frequencia_semanal: number | null;
            data_nascimento: string | null;
            sexo_biologico: string | null;
            restricoes_alimentares: string[] | null;
            preferencias_alimentares: string | null;
          }> | null;
          error: { message: string } | null;
        }>;
      };
    };
  };

  const [{ data: pacientes, error: pacientesError }, { data: avaliacoes, error: avaliacoesError }, { data: protocolos, error: protocolosError }] =
    await Promise.all([
      pacientesQuery
        .select(
          "auth_id, nome, peso_kg, altura_cm, objetivo, nivel_atividade, treino_frequencia_semanal, data_nascimento, sexo_biologico, restricoes_alimentares, preferencias_alimentares",
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
        .like("nome", "Matriz NTR -%")
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
        sexoBiologico:
          paciente.sexo_biologico === "masculino" || paciente.sexo_biologico === "feminino"
            ? paciente.sexo_biologico
            : null,
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
