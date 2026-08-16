export type ObjetivoMatriz =
  | "emagrecimento"
  | "recomposicao"
  | "hipertrofia"
  | "manutencao"
  | "performance"
  | "saude_geral";

export type NivelAtividade = "sedentario" | "leve" | "moderado" | "intenso";
export type SexoBiologico = "masculino" | "feminino";
export type NumeroRefeicoes = 4 | 5 | 6;

export interface MatrizInput {
  pesoKg: number;
  alturaCm?: number;
  idade?: number;
  sexo?: SexoBiologico;
  massaMagraKg?: number;
  percentualGordura?: number;
  nivelAtividade: NivelAtividade;
  objetivo: ObjetivoMatriz;
  numeroRefeicoes: NumeroRefeicoes;
  gastoEnergeticoManual?: number;
}

export interface DistribuicaoRefeicao {
  nome: string;
  percentual: number;
  kcal: number;
}

export interface MatrizResultado {
  codigo: "A" | "B" | "C";
  nome: string;
  numeroRefeicoes: NumeroRefeicoes;
  rmrKcal: number | null;
  metodoRmr: "Harris-Benedict revisada (1984)" | null;
  getKcal: number | null;
  getOrigem: "calculado" | "manual" | null;
  fatorAtividade: number;
  ajusteObjetivoPercentual: number;
  energiaAlvoKcal: number | null;
  proteinaG: number | null;
  carboidratoG: number | null;
  gorduraG: number | null;
  kcalCalculadasPelosMacros: number | null;
  distribuicao: DistribuicaoRefeicao[];
  avisos: string[];
}

const FATOR_ATIVIDADE: Record<NivelAtividade, number> = {
  sedentario: 1.2,
  leve: 1.375,
  moderado: 1.55,
  intenso: 1.725,
};

const AJUSTE_OBJETIVO: Record<ObjetivoMatriz, number> = {
  emagrecimento: -0.15,
  recomposicao: -0.05,
  hipertrofia: 0.08,
  manutencao: 0,
  performance: 0,
  saude_geral: 0,
};

const PROTEINA_G_KG: Record<ObjetivoMatriz, number> = {
  emagrecimento: 1.8,
  recomposicao: 1.8,
  hipertrofia: 1.8,
  manutencao: 1.6,
  performance: 1.6,
  saude_geral: 1.4,
};

const MATRIZES: Record<NumeroRefeicoes, { codigo: "A" | "B" | "C"; nome: string; refeicoes: { nome: string; percentual: number }[] }> = {
  4: {
    codigo: "A",
    nome: "Matriz A — 4 refeições",
    refeicoes: [
      { nome: "Café da manhã", percentual: 25 },
      { nome: "Almoço", percentual: 35 },
      { nome: "Lanche da tarde", percentual: 15 },
      { nome: "Jantar", percentual: 25 },
    ],
  },
  5: {
    codigo: "B",
    nome: "Matriz B — 5 refeições",
    refeicoes: [
      { nome: "Café da manhã", percentual: 20 },
      { nome: "Lanche da manhã", percentual: 10 },
      { nome: "Almoço", percentual: 30 },
      { nome: "Lanche da tarde", percentual: 15 },
      { nome: "Jantar", percentual: 25 },
    ],
  },
  6: {
    codigo: "C",
    nome: "Matriz C — 6 refeições",
    refeicoes: [
      { nome: "Café da manhã", percentual: 20 },
      { nome: "Lanche da manhã", percentual: 10 },
      { nome: "Almoço", percentual: 30 },
      { nome: "Lanche da tarde", percentual: 15 },
      { nome: "Jantar", percentual: 20 },
      { nome: "Ceia", percentual: 5 },
    ],
  },
};

function arredondar50(valor: number) {
  return Math.round(valor / 50) * 50;
}

/**
 * Harris-Benedict revisada por Roza & Shizgal (1984).
 * Peso em kg, altura em cm e idade em anos.
 * Homem: 88.362 + 13.397W + 4.799H - 5.677A
 * Mulher: 447.593 + 9.247W + 3.098H - 4.330A
 */
function calcularRmr(input: MatrizInput): { kcal: number; metodo: MatrizResultado["metodoRmr"] } | null {
  if (
    input.pesoKg <= 0 ||
    !input.alturaCm ||
    input.alturaCm <= 0 ||
    !input.idade ||
    input.idade <= 0 ||
    !input.sexo
  ) {
    return null;
  }

  const kcal =
    input.sexo === "masculino"
      ? 88.362 + 13.397 * input.pesoKg + 4.799 * input.alturaCm - 5.677 * input.idade
      : 447.593 + 9.247 * input.pesoKg + 3.098 * input.alturaCm - 4.33 * input.idade;

  return {
    kcal: Math.round(kcal),
    metodo: "Harris-Benedict revisada (1984)",
  };
}

export function calcularMatrizNutricional(input: MatrizInput): MatrizResultado {
  const matriz = MATRIZES[input.numeroRefeicoes];
  const avisos: string[] = [];
  const rmr = calcularRmr(input);
  const fatorAtividade = FATOR_ATIVIDADE[input.nivelAtividade];

  let getKcal: number | null = null;
  let getOrigem: MatrizResultado["getOrigem"] = null;

  if (input.gastoEnergeticoManual && input.gastoEnergeticoManual > 0) {
    getKcal = Math.round(input.gastoEnergeticoManual);
    getOrigem = "manual";
  } else if (rmr) {
    getKcal = Math.round(rmr.kcal * fatorAtividade);
    getOrigem = "calculado";
  }

  const ajuste = AJUSTE_OBJETIVO[input.objetivo];
  const energiaAlvoKcal = getKcal ? arredondar50(getKcal * (1 + ajuste)) : null;

  let proteinaG: number | null = null;
  let gorduraG: number | null = null;
  let carboidratoG: number | null = null;
  let kcalMacros: number | null = null;

  if (energiaAlvoKcal && input.pesoKg > 0) {
    proteinaG = Math.round(input.pesoKg * PROTEINA_G_KG[input.objetivo]);
    gorduraG = Math.round((energiaAlvoKcal * 0.25) / 9);
    carboidratoG = Math.max(0, Math.round((energiaAlvoKcal - proteinaG * 4 - gorduraG * 9) / 4));
    kcalMacros = proteinaG * 4 + carboidratoG * 4 + gorduraG * 9;
  }

  if (!input.massaMagraKg && !input.percentualGordura) {
    avisos.push("Sem composição corporal recente: a matriz pode ser usada, mas vale revisar a estratégia com a avaliação física.");
  }
  if (!rmr && !input.gastoEnergeticoManual) {
    avisos.push("Para calcular o gasto pela Harris-Benedict, complete peso, altura, idade e sexo biológico.");
  }
  if (rmr && energiaAlvoKcal && energiaAlvoKcal < rmr.kcal) {
    avisos.push("A energia-alvo ficou abaixo da estimativa de repouso; revise clinicamente antes de criar o plano.");
  }
  if (carboidratoG !== null && input.pesoKg > 0 && carboidratoG / input.pesoKg < 1) {
    avisos.push("A disponibilidade de carboidratos ficou baixa para o peso informado; revise especialmente se houver treino frequente ou objetivo de performance.");
  }
  if (input.objetivo === "performance") {
    avisos.push("Performance exige ajuste pelo volume e pela modalidade de treino; use esta matriz como ponto de partida, não como prescrição final.");
  }

  const distribuicao: DistribuicaoRefeicao[] = matriz.refeicoes.map((refeicao) => ({
    ...refeicao,
    kcal: energiaAlvoKcal ? Math.round((energiaAlvoKcal * refeicao.percentual) / 100) : 0,
  }));

  return {
    codigo: matriz.codigo,
    nome: matriz.nome,
    numeroRefeicoes: input.numeroRefeicoes,
    rmrKcal: rmr?.kcal ?? null,
    metodoRmr: rmr?.metodo ?? null,
    getKcal,
    getOrigem,
    fatorAtividade,
    ajusteObjetivoPercentual: Math.round(ajuste * 100),
    energiaAlvoKcal,
    proteinaG,
    carboidratoG,
    gorduraG,
    kcalCalculadasPelosMacros: kcalMacros,
    distribuicao,
    avisos,
  };
}

export function objetivoLabel(objetivo: ObjetivoMatriz) {
  const labels: Record<ObjetivoMatriz, string> = {
    emagrecimento: "Emagrecimento",
    recomposicao: "Recomposição corporal",
    hipertrofia: "Hipertrofia",
    manutencao: "Manutenção",
    performance: "Performance",
    saude_geral: "Saúde geral",
  };
  return labels[objetivo];
}
