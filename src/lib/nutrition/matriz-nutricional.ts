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
  energiaCalculadaKcal: number | null;
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

export const FAIXAS_ENERGETICAS_MATRIZ = [
  1400, 1600, 1800, 2000, 2200, 2400, 2600, 2800, 3000,
] as const;

const MATRIZES: Record<NumeroRefeicoes, { codigo: "A" | "B" | "C"; nome: string; refeicoes: { nome: string; percentual: number }[] }> = {
  4: {
    codigo: "A",
    nome: "Matriz A - 4 refeições",
    refeicoes: [
      { nome: "Café da manhã", percentual: 25 },
      { nome: "Almoço", percentual: 35 },
      { nome: "Lanche da tarde", percentual: 15 },
      { nome: "Jantar", percentual: 25 },
    ],
  },
  5: {
    codigo: "B",
    nome: "Matriz B - 5 refeições",
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
    nome: "Matriz C - 6 refeições",
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

const MATRIZES_PERFORMANCE: Record<NumeroRefeicoes, { nome: string; percentual: number }[]> = {
  4: [
    { nome: "Café da manhã", percentual: 22.5 },
    { nome: "Almoço", percentual: 31.5 },
    { nome: "Pré-treino", percentual: 10 },
    { nome: "Lanche da tarde", percentual: 13.5 },
    { nome: "Jantar", percentual: 22.5 },
  ],
  5: [
    { nome: "Café da manhã", percentual: 18 },
    { nome: "Lanche da manhã", percentual: 9 },
    { nome: "Almoço", percentual: 27 },
    { nome: "Pré-treino", percentual: 10 },
    { nome: "Lanche da tarde", percentual: 13.5 },
    { nome: "Jantar", percentual: 22.5 },
  ],
  6: [
    { nome: "Café da manhã", percentual: 18 },
    { nome: "Lanche da manhã", percentual: 9 },
    { nome: "Almoço", percentual: 27 },
    { nome: "Pré-treino", percentual: 10 },
    { nome: "Lanche da tarde", percentual: 13.5 },
    { nome: "Jantar", percentual: 18 },
    { nome: "Ceia", percentual: 4.5 },
  ],
};

function faixaEnergeticaMaisProxima(valor: number) {
  return FAIXAS_ENERGETICAS_MATRIZ.reduce((melhor, atual) =>
    Math.abs(atual - valor) < Math.abs(melhor - valor) ? atual : melhor,
  );
}

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

  return { kcal: Math.round(kcal), metodo: "Harris-Benedict revisada (1984)" };
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
  const energiaCalculadaKcal = getKcal ? Math.round(getKcal * (1 + ajuste)) : null;
  const energiaAlvoKcal = energiaCalculadaKcal ? faixaEnergeticaMaisProxima(energiaCalculadaKcal) : null;

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
  if (rmr && energiaCalculadaKcal && energiaCalculadaKcal < rmr.kcal) {
    avisos.push("A energia calculada ficou abaixo da estimativa de repouso; revise clinicamente antes de criar o plano.");
  }
  if (carboidratoG !== null && input.pesoKg > 0 && carboidratoG / input.pesoKg < 1) {
    avisos.push("A disponibilidade de carboidratos ficou baixa para o peso informado; revise especialmente se houver treino frequente.");
  }

  const refeicoes = input.objetivo === "performance" ? MATRIZES_PERFORMANCE[input.numeroRefeicoes] : matriz.refeicoes;
  const distribuicao: DistribuicaoRefeicao[] = refeicoes.map((refeicao) => ({
    ...refeicao,
    kcal: energiaAlvoKcal ? Math.round((energiaAlvoKcal * refeicao.percentual) / 100) : 0,
  }));

  return {
    codigo: matriz.codigo,
    nome: input.objetivo === "performance" ? `${matriz.nome} + pré-treino` : matriz.nome,
    numeroRefeicoes: input.numeroRefeicoes,
    rmrKcal: rmr?.kcal ?? null,
    metodoRmr: rmr?.metodo ?? null,
    getKcal,
    getOrigem,
    fatorAtividade,
    ajusteObjetivoPercentual: Math.round(ajuste * 100),
    energiaCalculadaKcal,
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
