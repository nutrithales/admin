"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Calculator,
  CheckCircle2,
  ClipboardPlus,
  Info,
  TriangleAlert,
  TrendingDown,
  TrendingUp,
  Activity,
  UtensilsCrossed,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { PageHeader } from "@/components/ui/PageHeader";
import { FieldGroup, Input, Label } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useToast } from "@/contexts/ToastContext";
import { createPlanoEstruturadoAction } from "@/services/planos-estruturados.actions";
import type {
  MatrizPacienteOption,
  MatrizProtocoloOption,
} from "@/services/matriz-nutricional.queries";
import {
  calcularMatrizNutricional,
  objetivoLabel,
  type NivelAtividade,
  type NumeroRefeicoes,
  type ObjetivoMatriz,
  type SexoBiologico,
} from "@/lib/nutrition/matriz-nutricional";

const objetivos: ObjetivoMatriz[] = [
  "emagrecimento",
  "recomposicao",
  "hipertrofia",
  "manutencao",
  "performance",
  "saude_geral",
];

function objetivoValido(valor: string | null): ObjetivoMatriz {
  if (valor && objetivos.includes(valor as ObjetivoMatriz)) return valor as ObjetivoMatriz;
  return "emagrecimento";
}

function atividadeValida(valor: string | null): NivelAtividade {
  if (valor === "sedentario" || valor === "leve" || valor === "moderado" || valor === "intenso") return valor;
  return "moderado";
}

function calcularIdade(dataNascimento: string | null) {
  if (!dataNascimento) return undefined;
  const nascimento = new Date(`${dataNascimento}T12:00:00`);
  const hoje = new Date();
  let idade = hoje.getFullYear() - nascimento.getFullYear();
  const aniversarioPassou =
    hoje.getMonth() > nascimento.getMonth() ||
    (hoje.getMonth() === nascimento.getMonth() && hoje.getDate() >= nascimento.getDate());
  if (!aniversarioPassou) idade -= 1;
  return idade > 0 ? idade : undefined;
}

function n(valor: string) {
  const numero = Number(valor.replace(",", "."));
  return Number.isFinite(numero) && numero > 0 ? numero : undefined;
}

function formatarData(data: string) {
  return new Intl.DateTimeFormat("pt-BR").format(new Date(data));
}

function kg(valor: number) {
  return valor.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

function projetarResultados(
  objetivo: ObjetivoMatriz,
  pesoKg: number | undefined,
  getKcal: number | null | undefined,
  metaKcal: number | undefined,
  treinoFrequencia: number | null | undefined,
) {
  if (!pesoKg || !getKcal || !metaKcal) return null;

  const diferencaPercentual = (metaKcal - getKcal) / getKcal;

  if (objetivo === "emagrecimento") {
    const intensidade = Math.min(1, Math.max(0.55, Math.abs(diferencaPercentual) / 0.15));
    const ritmoMin = pesoKg * 0.003 * intensidade;
    const ritmoMax = pesoKg * 0.006 * intensidade;
    return {
      titulo: "Tendência esperada de redução de peso",
      subtitulo: `Aproximadamente ${kg(ritmoMin)} a ${kg(ritmoMax)} kg por semana, se a aderência e o gasto permanecerem próximos do estimado.`,
      tom: "down" as const,
      horizontes: [4, 8, 12].map((semanas) => ({
        semanas,
        texto: `${kg(ritmoMin * semanas)} a ${kg(ritmoMax * semanas)} kg de redução`,
      })),
      nota: "A velocidade real pode variar com retenção hídrica, ciclo menstrual, treino, sono, adesão e adaptação metabólica. O objetivo é preservar massa magra, não acelerar a balança.",
    };
  }

  if (objetivo === "hipertrofia") {
    const ritmoMin = pesoKg * 0.001;
    const ritmoMax = pesoKg * 0.0025;
    return {
      titulo: "Tendência esperada de ganho de peso",
      subtitulo: `Meta conservadora de aproximadamente ${kg(ritmoMin)} a ${kg(ritmoMax)} kg por semana.`,
      tom: "up" as const,
      horizontes: [4, 8, 12].map((semanas) => ({
        semanas,
        texto: `${kg(ritmoMin * semanas)} a ${kg(ritmoMax * semanas)} kg de ganho de peso`,
      })),
      nota: "Ganho de peso não significa ganho equivalente de músculo. A resposta depende principalmente de treinamento, experiência, sono, genética e aderência ao superávit.",
    };
  }

  if (objetivo === "recomposicao") {
    return {
      titulo: "Tendência esperada de recomposição corporal",
      subtitulo: "O peso pode mudar pouco mesmo com melhora relevante da composição corporal.",
      tom: "stable" as const,
      horizontes: [
        { semanas: 4, texto: "Primeiros sinais em medidas, fotos e desempenho" },
        { semanas: 8, texto: "Melhor leitura da tendência de gordura e massa magra" },
        { semanas: 12, texto: "Janela mais adequada para avaliar mudança corporal consolidada" },
      ],
      nota: "Priorize percentual de gordura, circunferências, evolução de cargas e avaliação física em vez de usar apenas o peso.",
    };
  }

  if (objetivo === "performance") {
    return {
      titulo: "Resultados esperados para performance",
      subtitulo: "A estratégia prioriza disponibilidade energética, pré-treino e recuperação sem buscar mudança rápida de peso.",
      tom: "performance" as const,
      horizontes: [
        { semanas: 4, texto: "Melhor tolerância à rotina de treinos e menor oscilação de energia" },
        { semanas: 8, texto: "Maior consistência de recuperação e execução dos treinos" },
        { semanas: 12, texto: "Janela para comparar desempenho, recuperação e composição corporal" },
      ],
      nota: `${treinoFrequencia ? `${treinoFrequencia} sessões semanais cadastradas. ` : ""}A melhora esportiva não pode ser prevista em percentual apenas pela dieta e deve ser acompanhada junto à carga de treinamento, sono e recuperação.",
    };
  }

  return {
    titulo: objetivo === "manutencao" ? "Tendência esperada de manutenção" : "Tendência esperada de saúde geral",
    subtitulo: "A estratégia busca estabilidade de peso com melhor organização alimentar e adequação nutricional.",
    tom: "stable" as const,
    horizontes: [
      { semanas: 4, texto: "Estabilizar rotina, fome, energia e ingestão" },
      { semanas: 8, texto: "Consolidar aderência e estabilidade de peso" },
      { semanas: 12, texto: "Reavaliar necessidade energética e composição corporal" },
    ],
    nota: "Mudanças de peso fora do esperado devem levar à revisão do gasto energético, rotina e aderência antes de alterar o plano.",
  };
}

export function MatrizNutricionalClient({
  pacientes,
  matrizes,
}: {
  pacientes: MatrizPacienteOption[];
  matrizes: MatrizProtocoloOption[];
}) {
  const router = useRouter();
  const { toast } = useToast();

  const [authId, setAuthId] = useState("");
  const [objetivo, setObjetivo] = useState<ObjetivoMatriz>("emagrecimento");
  const [numeroRefeicoes, setNumeroRefeicoes] = useState<NumeroRefeicoes>(5);
  const [nivelAtividade, setNivelAtividade] = useState<NivelAtividade>("moderado");
  const [sexo, setSexo] = useState<SexoBiologico | "">("");
  const [peso, setPeso] = useState("");
  const [altura, setAltura] = useState("");
  const [percentualGordura, setPercentualGordura] = useState("");
  const [massaMagra, setMassaMagra] = useState("");
  const [metaKcal, setMetaKcal] = useState("");
  const [metaProteina, setMetaProteina] = useState("");
  const [metaCarboidrato, setMetaCarboidrato] = useState("");
  const [metaGordura, setMetaGordura] = useState("");
  const [saving, setSaving] = useState(false);

  const paciente = useMemo(
    () => pacientes.find((p) => p.authId === authId) ?? null,
    [authId, pacientes],
  );
  const idade = calcularIdade(paciente?.dataNascimento ?? null);

  useEffect(() => {
    if (!paciente) {
      setSexo("");
      return;
    }
    const avaliacao = paciente.avaliacao;
    const pesoPreferido = avaliacao?.pesoKg ?? paciente.pesoKg;
    const alturaPreferida = avaliacao?.alturaCm ?? paciente.alturaCm;

    setPeso(pesoPreferido ? String(pesoPreferido) : "");
    setAltura(alturaPreferida ? String(alturaPreferida) : "");
    setPercentualGordura(
      avaliacao?.percentualGordura != null ? String(avaliacao.percentualGordura) : "",
    );
    setMassaMagra(avaliacao?.massaMagraKg != null ? String(avaliacao.massaMagraKg) : "");
    setObjetivo(objetivoValido(paciente.objetivo));
    setNivelAtividade(atividadeValida(paciente.nivelAtividade));
    setSexo(paciente.sexoBiologico ?? "");
  }, [paciente]);

  const massaMagraDerivada = useMemo(() => {
    const massaInformada = n(massaMagra);
    if (massaInformada) return massaInformada;
    const pesoKg = n(peso);
    const gordura = n(percentualGordura);
    if (!pesoKg || !gordura || gordura >= 100) return undefined;
    return Math.round(pesoKg * (1 - gordura / 100) * 10) / 10;
  }, [massaMagra, percentualGordura, peso]);

  const dadosHarrisCompletos = Boolean(n(peso) && n(altura) && idade && sexo);

  const resultado = useMemo(() => {
    const pesoKg = n(peso);
    if (!pesoKg) return null;

    return calcularMatrizNutricional({
      pesoKg,
      alturaCm: n(altura),
      idade,
      sexo: sexo || undefined,
      massaMagraKg: massaMagraDerivada,
      percentualGordura: n(percentualGordura),
      nivelAtividade,
      objetivo,
      numeroRefeicoes,
    });
  }, [altura, idade, massaMagraDerivada, nivelAtividade, numeroRefeicoes, objetivo, percentualGordura, peso, sexo]);

  useEffect(() => {
    if (!resultado?.energiaAlvoKcal) {
      setMetaKcal("");
      setMetaProteina("");
      setMetaCarboidrato("");
      setMetaGordura("");
      return;
    }

    setMetaKcal(String(resultado.energiaAlvoKcal));
    setMetaProteina(resultado.proteinaG ? String(resultado.proteinaG) : "");
    setMetaCarboidrato(resultado.carboidratoG ? String(resultado.carboidratoG) : "");
    setMetaGordura(resultado.gorduraG ? String(resultado.gorduraG) : "");
  }, [resultado]);

  const protocoloMatriz = useMemo(() => {
    const candidatos = matrizes.filter((m) => m.numeroRefeicoes === numeroRefeicoes);
    if (objetivo === "performance") {
      return candidatos.find((m) => m.nome.toLowerCase().includes("performance")) ?? candidatos[0] ?? null;
    }
    return candidatos.find((m) => !m.nome.toLowerCase().includes("performance")) ?? candidatos[0] ?? null;
  }, [matrizes, numeroRefeicoes, objetivo]);

  const kcalMeta = n(metaKcal);
  const proteinaMeta = n(metaProteina);
  const carboMeta = n(metaCarboidrato);
  const gorduraMeta = n(metaGordura);
  const kcalMacros =
    proteinaMeta && carboMeta && gorduraMeta
      ? proteinaMeta * 4 + carboMeta * 4 + gorduraMeta * 9
      : null;
  const diferencaMacros =
    kcalMeta && kcalMacros ? Math.abs(kcalMacros - kcalMeta) / kcalMeta : null;
  const macrosValidos = diferencaMacros !== null && diferencaMacros <= 0.03;

  const distribuicaoAjustada = resultado?.distribuicao.map((refeicao) => ({
    ...refeicao,
    kcal: kcalMeta ? Math.round((kcalMeta * refeicao.percentual) / 100) : refeicao.kcal,
  }));

  const projecao = useMemo(
    () => projetarResultados(objetivo, n(peso), resultado?.getKcal, kcalMeta, paciente?.treinoFrequenciaSemanal),
    [objetivo, peso, resultado?.getKcal, kcalMeta, paciente?.treinoFrequenciaSemanal],
  );

  async function criarPlano() {
    if (!paciente || !protocoloMatriz || !kcalMeta || !proteinaMeta || !carboMeta || !gorduraMeta) {
      toast({ kind: "error", title: "Complete os dados antes de criar o plano." });
      return;
    }
    if (!dadosHarrisCompletos) {
      toast({
        kind: "error",
        title: "Harris-Benedict incompleta",
        description: "Peso, altura, idade e sexo biológico são necessários para calcular o gasto energético.",
      });
      return;
    }
    if (!macrosValidos) {
      toast({
        kind: "error",
        title: "Revise os macronutrientes",
        description: "A soma dos macros precisa ficar a até 3% da meta calórica.",
      });
      return;
    }

    setSaving(true);
    const contexto = [
      `Matriz ${resultado?.codigo ?? ""} (${numeroRefeicoes} refeições).`,
      `Objetivo: ${objetivoLabel(objetivo)}.`,
      `Gasto estimado por Harris-Benedict revisada (1984): ${resultado?.getKcal ?? "não calculado"} kcal.`,
      paciente.avaliacao
        ? `Avaliação física de ${formatarData(paciente.avaliacao.data)} utilizada como referência.`
        : "Sem avaliação física recente vinculada.",
      paciente.preferenciasAlimentares
        ? `Rotina/preferências cadastradas: ${paciente.preferenciasAlimentares}`
        : null,
      paciente.restricoesAlimentares.length
        ? `Restrições cadastradas: ${paciente.restricoesAlimentares.join(", ")}.`
        : null,
      "Metas e matriz foram sugeridas pelo módulo clínico e revisadas pelo nutricionista antes da criação do plano.",
    ]
      .filter(Boolean)
      .join(" ");

    const resposta = await createPlanoEstruturadoAction(paciente.authId, protocoloMatriz.id, {
      titulo: `${resultado?.nome ?? "Matriz nutricional"} - ${paciente.nome}`,
      meta_kcal: Math.round(kcalMeta),
      meta_proteina_g: Math.round(proteinaMeta),
      meta_carboidrato_g: Math.round(carboMeta),
      meta_gordura_g: Math.round(gorduraMeta),
      instrucoes_ia: contexto,
    });
    setSaving(false);

    if (!resposta.success || !resposta.planoId) {
      toast({
        kind: "error",
        title: "Não foi possível criar o plano",
        description: resposta.message,
      });
      return;
    }

    toast({ kind: "success", title: "Plano criado a partir da matriz." });
    router.push(`/planos-alimentares/${resposta.planoId}`);
  }

  return (
    <div>
      <PageHeader
        title="Matriz Nutricional"
        description="Cruza objetivo, composição corporal, atividade e número de refeições. O gasto energético é calculado pela Harris-Benedict revisada (1984), e a decisão final continua sendo clínica."
      />

      <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <section className="rounded-2xl border border-border bg-white p-5 shadow-sm">
          <div className="mb-5 flex items-center gap-2">
            <ClipboardPlus className="size-5 text-brand" />
            <div>
              <h2 className="font-semibold text-ink">1. Dados para a estratégia</h2>
              <p className="text-sm text-muted">A avaliação física mais recente é carregada automaticamente quando existir.</p>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <FieldGroup>
              <Label htmlFor="paciente-matriz">Paciente</Label>
              <Select id="paciente-matriz" value={authId} onChange={(e) => setAuthId(e.target.value)}>
                <option value="">Selecione um paciente</option>
                {pacientes.map((p) => (
                  <option key={p.authId} value={p.authId}>{p.nome}</option>
                ))}
              </Select>
            </FieldGroup>

            {paciente?.avaliacao && (
              <div className="rounded-xl bg-bg-alt p-3 text-sm text-muted">
                <span className="font-semibold text-ink">Avaliação carregada:</span>{" "}
                {formatarData(paciente.avaliacao.data)}
                {paciente.avaliacao.percentualGordura != null
                  ? ` · ${paciente.avaliacao.percentualGordura}% de gordura`
                  : ""}
                {paciente.avaliacao.massaMagraKg != null
                  ? ` · ${paciente.avaliacao.massaMagraKg} kg de massa magra`
                  : ""}
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <FieldGroup>
                <Label htmlFor="objetivo-matriz">Objetivo principal</Label>
                <Select
                  id="objetivo-matriz"
                  value={objetivo}
                  onChange={(e) => setObjetivo(e.target.value as ObjetivoMatriz)}
                >
                  {objetivos.map((item) => (
                    <option key={item} value={item}>{objetivoLabel(item)}</option>
                  ))}
                </Select>
              </FieldGroup>

              <FieldGroup>
                <Label htmlFor="refeicoes-matriz">Refeições por dia</Label>
                <Select
                  id="refeicoes-matriz"
                  value={String(numeroRefeicoes)}
                  onChange={(e) => setNumeroRefeicoes(Number(e.target.value) as NumeroRefeicoes)}
                >
                  <option value="4">4 refeições - Matriz A</option>
                  <option value="5">5 refeições - Matriz B</option>
                  <option value="6">6 refeições - Matriz C</option>
                </Select>
              </FieldGroup>
            </div>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <FieldGroup>
                <Label htmlFor="peso-matriz">Peso (kg)</Label>
                <Input id="peso-matriz" type="number" step="0.1" value={peso} onChange={(e) => setPeso(e.target.value)} />
              </FieldGroup>
              <FieldGroup>
                <Label htmlFor="altura-matriz">Altura (cm)</Label>
                <Input id="altura-matriz" type="number" step="0.1" value={altura} onChange={(e) => setAltura(e.target.value)} />
              </FieldGroup>
              <FieldGroup>
                <Label htmlFor="gordura-matriz">Gordura (%)</Label>
                <Input id="gordura-matriz" type="number" step="0.1" value={percentualGordura} onChange={(e) => setPercentualGordura(e.target.value)} />
              </FieldGroup>
              <FieldGroup>
                <Label htmlFor="massa-magra-matriz">Massa magra (kg)</Label>
                <Input id="massa-magra-matriz" type="number" step="0.1" value={massaMagra} onChange={(e) => setMassaMagra(e.target.value)} />
                {!n(massaMagra) && massaMagraDerivada && (
                  <p className="mt-1 text-xs text-muted">Calculada pela composição: {massaMagraDerivada} kg</p>
                )}
              </FieldGroup>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <FieldGroup>
                <Label htmlFor="atividade-matriz">Nível de atividade</Label>
                <Select
                  id="atividade-matriz"
                  value={nivelAtividade}
                  onChange={(e) => setNivelAtividade(e.target.value as NivelAtividade)}
                >
                  <option value="sedentario">Sedentário · ×1,20</option>
                  <option value="leve">Leve · ×1,375</option>
                  <option value="moderado">Moderado · ×1,55</option>
                  <option value="intenso">Intenso · ×1,725</option>
                </Select>
              </FieldGroup>

              <FieldGroup>
                <Label htmlFor="sexo-matriz">Sexo biológico</Label>
                <Select id="sexo-matriz" value={sexo} onChange={(e) => setSexo(e.target.value as SexoBiologico | "")}>
                  <option value="">Selecione</option>
                  <option value="masculino">Masculino</option>
                  <option value="feminino">Feminino</option>
                </Select>
              </FieldGroup>

              <FieldGroup>
                <Label>Idade</Label>
                <Input value={idade ? `${idade} anos` : "Data de nascimento não cadastrada"} disabled />
              </FieldGroup>
            </div>

            <div className="rounded-xl border border-border bg-bg-alt p-3 text-xs text-muted">
              <p className="font-semibold text-ink">Harris-Benedict revisada (Roza & Shizgal, 1984)</p>
              <p className="mt-1">Homens: 88,362 + 13,397 × peso + 4,799 × altura − 5,677 × idade.</p>
              <p>Mulheres: 447,593 + 9,247 × peso + 3,098 × altura − 4,330 × idade.</p>
              <p className="mt-1">A TMB estimada é multiplicada pelo fator de atividade para chegar ao GET.</p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-white p-5 shadow-sm">
          <div className="mb-5 flex items-center gap-2">
            <Calculator className="size-5 text-brand" />
            <div>
              <h2 className="font-semibold text-ink">2. Matriz sugerida</h2>
              <p className="text-sm text-muted">Confira a lógica e ajuste as metas antes de criar o plano.</p>
            </div>
          </div>

          {!resultado ? (
            <div className="flex min-h-72 flex-col items-center justify-center rounded-xl border border-dashed border-border p-6 text-center">
              <UtensilsCrossed className="mb-3 size-8 text-muted-light" />
              <p className="font-semibold text-ink">Selecione o paciente e informe o peso</p>
              <p className="mt-1 max-w-md text-sm text-muted">A recomendação aparece aqui sem alterar nenhum plano existente.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-5">
              <div className="rounded-2xl bg-bg-alt p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="mb-2 flex items-center gap-2">
                      <Badge tone="brand">Recomendada</Badge>
                      <Badge tone="muted">{objetivoLabel(objetivo)}</Badge>
                    </div>
                    <h3 className="text-xl font-semibold text-ink">{resultado.nome}</h3>
                    <p className="mt-1 text-sm text-muted">
                      {resultado.energiaAlvoKcal
                        ? `${resultado.energiaAlvoKcal} kcal como ponto de partida`
                        : "Complete os dados da Harris-Benedict para calcular a energia"}
                    </p>
                  </div>

                  <div className="text-right text-sm text-muted">
                    <p>TMB: {resultado.rmrKcal ? `${resultado.rmrKcal} kcal` : "-"}</p>
                    <p>GET: {resultado.getKcal ? `${resultado.getKcal} kcal` : "-"}</p>
                    {resultado.metodoRmr && <p className="text-xs">{resultado.metodoRmr}</p>}
                  </div>
                </div>
              </div>

              <div>
                <p className="mb-2 text-sm font-semibold text-ink">Por que esta estratégia?</p>
                <div className="grid gap-2 text-sm sm:grid-cols-2">
                  <div className="rounded-xl border border-border p-3"><span className="text-muted">Objetivo:</span> <strong>{objetivoLabel(objetivo)}</strong></div>
                  <div className="rounded-xl border border-border p-3"><span className="text-muted">Ajuste energético:</span> <strong>{resultado.ajusteObjetivoPercentual > 0 ? "+" : ""}{resultado.ajusteObjetivoPercentual}%</strong></div>
                  <div className="rounded-xl border border-border p-3"><span className="text-muted">Refeições:</span> <strong>{numeroRefeicoes}/dia</strong></div>
                  <div className="rounded-xl border border-border p-3"><span className="text-muted">Composição:</span> <strong>{massaMagraDerivada ? `${massaMagraDerivada} kg MLG` : "não disponível"}</strong></div>
                </div>
              </div>

              {projecao && (
                <div className="rounded-2xl border border-border bg-white p-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 rounded-xl bg-bg-alt p-2 text-brand">
                      {projecao.tom === "down" ? <TrendingDown className="size-5" /> : projecao.tom === "up" ? <TrendingUp className="size-5" /> : <Activity className="size-5" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-ink">Resultados esperados</p>
                        <Badge tone="muted">estimativa clínica</Badge>
                      </div>
                      <p className="mt-1 font-medium text-ink">{projecao.titulo}</p>
                      <p className="mt-1 text-sm text-muted">{projecao.subtitulo}</p>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-2 sm:grid-cols-3">
                    {projecao.horizontes.map((item) => (
                      <div key={item.semanas} className="rounded-xl bg-bg-alt p-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted">{item.semanas} semanas</p>
                        <p className="mt-1 text-sm font-medium text-ink">{item.texto}</p>
                      </div>
                    ))}
                  </div>

                  <p className="mt-3 text-xs leading-relaxed text-muted">{projecao.nota}</p>
                </div>
              )}

              {resultado.avisos.length > 0 && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                  <div className="mb-2 flex items-center gap-2 font-semibold text-amber-900"><TriangleAlert className="size-4" /> Revisão clínica</div>
                  <ul className="space-y-1 text-sm text-amber-900">
                    {resultado.avisos.map((aviso) => <li key={aviso}>• {aviso}</li>)}
                  </ul>
                </div>
              )}

              <div>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-ink">Metas finais - editáveis</p>
                  {macrosValidos ? (
                    <span className="flex items-center gap-1 text-xs font-medium text-green-700"><CheckCircle2 className="size-3.5" /> Macros conferidos</span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs font-medium text-amber-700"><Info className="size-3.5" /> Confira kcal × macros</span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <FieldGroup><Label>Kcal</Label><Input type="number" value={metaKcal} onChange={(e) => setMetaKcal(e.target.value)} /></FieldGroup>
                  <FieldGroup><Label>Proteína (g)</Label><Input type="number" value={metaProteina} onChange={(e) => setMetaProteina(e.target.value)} /></FieldGroup>
                  <FieldGroup><Label>Carboidrato (g)</Label><Input type="number" value={metaCarboidrato} onChange={(e) => setMetaCarboidrato(e.target.value)} /></FieldGroup>
                  <FieldGroup><Label>Gordura (g)</Label><Input type="number" value={metaGordura} onChange={(e) => setMetaGordura(e.target.value)} /></FieldGroup>
                </div>

                {kcalMacros && kcalMeta && (
                  <p className="mt-2 text-xs text-muted">Macros somam {Math.round(kcalMacros)} kcal · diferença de {Math.round(Math.abs(kcalMacros - kcalMeta))} kcal da meta.</p>
                )}
              </div>

              <div>
                <p className="mb-2 text-sm font-semibold text-ink">Distribuição inicial</p>
                <div className="space-y-2">
                  {distribuicaoAjustada?.map((refeicao) => (
                    <div key={refeicao.nome} className="flex items-center justify-between rounded-xl border border-border px-3 py-2 text-sm">
                      <span className="font-medium text-ink">{refeicao.nome}</span>
                      <span className="text-muted">{refeicao.percentual}% · {refeicao.kcal} kcal</span>
                    </div>
                  ))}
                </div>
              </div>

              {!protocoloMatriz && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                  A Matriz {resultado.codigo} ainda não está cadastrada nos protocolos do banco. O plano não será criado até isso ser corrigido.
                </div>
              )}

              <Button
                onClick={criarPlano}
                loading={saving}
                disabled={!protocoloMatriz || !dadosHarrisCompletos || !macrosValidos || !kcalMeta}
              >
                Criar plano com esta matriz
              </Button>
              <p className="text-center text-xs text-muted">Depois de criar, você segue para o editor normal do plano e pode ajustar refeições, alimentos e observações.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
