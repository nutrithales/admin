"use server";

import { assertAdmin } from "@/lib/supabase/assert-admin";
import { createClient } from "@/lib/supabase/server";
import { interpretarComando, COMANDOS_SUGERIDOS } from "@/lib/clara/comandos";
import { PENDENCIA_TIPO_LABEL, type PendenciaTipo } from "@/lib/clara/pendencias-engine";
import { computeConsultasStats } from "@/lib/clara/consultas";
import { fillTemplate, primeiroNome } from "@/lib/clara/mensagens";
import { syncPendencias } from "@/services/pendencias.actions";
import { listPendenciasAtivas, type PendenciaComPaciente } from "@/services/pendencias.queries";
import { listTarefasPendentes } from "@/services/tarefas.queries";
import { listMensagensModelos } from "@/services/mensagens.queries";
import { listConsultasDoIntervalo, inicioDoDia, fimDoDia } from "@/services/clara.queries";

export interface ComandoResposta {
  titulo: string;
  itens: string[];
  vazio: string;
}

function amanha(): Date {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d;
}

function porTipo(pendencias: PendenciaComPaciente[], tipos: PendenciaTipo[]) {
  return pendencias.filter((p) => tipos.includes(p.tipo as PendenciaTipo));
}

function linhaPendencia(p: PendenciaComPaciente) {
  return `${p.paciente?.nome ?? "Paciente"} — ${p.motivo}`;
}

/** Executa um comando da caixa de texto da Clara. Interpretação é só por
 * palavra-chave (sem IA paga) e toda resposta vem de dados reais do banco
 * — nunca texto inventado. */
export async function executarComandoAction(textoOriginal: string): Promise<ComandoResposta> {
  await assertAdmin();
  await syncPendencias();

  const { intencao, pacienteBusca } = interpretarComando(textoOriginal);

  switch (intencao) {
    case "organizar_dia": {
      const [consultasHoje, pendencias, tarefas] = await Promise.all([
        listConsultasDoIntervalo(inicioDoDia(), fimDoDia()),
        listPendenciasAtivas(),
        listTarefasPendentes(),
      ]);
      const itens = [
        `${consultasHoje.length} consulta(s) hoje.`,
        ...consultasHoje.map((c) => `${c.hora} — ${c.paciente} (${c.tipo ?? "consulta"}, ${c.status ?? "agendada"})`),
        `${pendencias.length} pendência(s) em aberto.`,
        `${tarefas.length} tarefa(s) administrativa(s) pendente(s).`,
      ];
      return { titulo: "Resumo do dia", itens, vazio: "Nada agendado hoje e nenhuma pendência em aberto." };
    }

    case "agenda_amanha": {
      const consultas = await listConsultasDoIntervalo(inicioDoDia(amanha()), fimDoDia(amanha()));
      return {
        titulo: "Agenda de amanhã",
        itens: consultas.map((c) => `${c.hora} — ${c.paciente} (${c.tipo ?? "consulta"}, ${c.status ?? "agendada"})`),
        vazio: "Nenhuma consulta agendada para amanhã.",
      };
    }

    case "sem_proxima_consulta": {
      const pendencias = porTipo(await listPendenciasAtivas(), ["sem_proxima_consulta"]);
      return { titulo: "Pacientes sem próxima consulta", itens: pendencias.map(linhaPendencia), vazio: "Todos os pacientes ativos têm uma próxima consulta agendada." };
    }

    case "renovar_plano":
    case "ultima_consulta_plano": {
      const pendencias = porTipo(await listPendenciasAtivas(), ["plano_proximo_fim", "plano_finalizado"]);
      return {
        titulo: intencao === "renovar_plano" ? "Pacientes para renovar o plano" : "Pacientes chegando à última consulta do plano",
        itens: pendencias.map(linhaPendencia),
        vazio: "Nenhum paciente com plano perto do fim no momento.",
      };
    }

    case "checkin_pendente": {
      const pendencias = porTipo(await listPendenciasAtivas(), ["checkin_nao_respondido", "checkin_pendente_envio"]);
      return { titulo: "Check-ins pendentes", itens: pendencias.map(linhaPendencia), vazio: "Nenhum check-in pendente." };
    }

    case "preparar_confirmacoes_amanha": {
      const [consultas, modelos] = await Promise.all([
        listConsultasDoIntervalo(inicioDoDia(amanha()), fimDoDia(amanha())),
        listMensagensModelos(),
      ]);
      const modelo = modelos.find((m) => m.chave === "confirmacao_consulta");
      const pendentesConfirmacao = consultas.filter((c) => c.status === "agendada");
      const itens = pendentesConfirmacao.map((c) => {
        const dataObj = c.dataIso ? new Date(c.dataIso) : null;
        const mensagem = modelo
          ? fillTemplate(modelo.corpo, {
              primeiro_nome: primeiroNome(c.paciente),
              data: dataObj ? dataObj.toLocaleDateString("pt-BR") : "",
              horario: c.hora,
              tipo_consulta: c.tipo ?? "consulta",
              local_ou_link: "combinar local/link",
            })
          : "Modelo de confirmação não configurado.";
        return `${c.paciente}: ${mensagem}`;
      });
      return {
        titulo: "Mensagens de confirmação para amanhã",
        itens,
        vazio: "Nenhuma consulta de amanhã ainda precisa de confirmação.",
      };
    }

    case "resumir_pendencias": {
      const pendencias = await listPendenciasAtivas();
      const contagem = new Map<string, number>();
      for (const p of pendencias) contagem.set(p.tipo, (contagem.get(p.tipo) ?? 0) + 1);
      const itens = [...contagem.entries()].map(
        ([tipo, qtd]) => `${PENDENCIA_TIPO_LABEL[tipo as PendenciaTipo] ?? tipo}: ${qtd}`,
      );
      return { titulo: "Pendências do consultório", itens, vazio: "Nenhuma pendência em aberto." };
    }

    case "aguardando_plano": {
      const pendencias = porTipo(await listPendenciasAtivas(), ["aguardando_plano_alimentar"]);
      return { titulo: "Aguardando plano alimentar", itens: pendencias.map(linhaPendencia), vazio: "Ninguém aguardando plano alimentar." };
    }

    case "parados_fluxo": {
      const pendencias = porTipo(await listPendenciasAtivas(), ["sem_movimentacao", "contato_necessario"]);
      return { titulo: "Pacientes parados no Fluxo", itens: pendencias.map(linhaPendencia), vazio: "Nenhum paciente parado no Fluxo." };
    }

    case "preparar_mensagem_renovacao": {
      if (!pacienteBusca) {
        return {
          titulo: "Mensagem de renovação",
          itens: [],
          vazio: 'Diga o nome do paciente, por exemplo: "prepare uma mensagem de renovação para Maria".',
        };
      }
      const supabase = await createClient();
      const { data: pacientes } = await supabase.from("pacientes").select("*");
      const alvo = (pacientes ?? []).find((p) =>
        (p.nome ?? "").toLocaleLowerCase("pt-BR").includes(pacienteBusca.toLocaleLowerCase("pt-BR")),
      );
      if (!alvo) {
        return { titulo: "Mensagem de renovação", itens: [], vazio: `Nenhum paciente encontrado com o nome "${pacienteBusca}".` };
      }
      const { data: consultasDoPaciente } = await supabase.from("consultas").select("status").eq("auth_id", alvo.auth_id);
      const stats = computeConsultasStats(alvo, consultasDoPaciente ?? []);
      const modelos = await listMensagensModelos();
      const modelo = modelos.find((m) => m.chave === "renovacao_plano");
      const mensagem = modelo
        ? fillTemplate(modelo.corpo, {
            primeiro_nome: primeiroNome(alvo.nome),
            plano: alvo.plano ?? "plano",
            consultas_realizadas: stats.realizadas,
            consultas_restantes: stats.restantes,
          })
        : "Modelo de renovação não configurado.";
      return { titulo: `Mensagem de renovação — ${alvo.nome}`, itens: [mensagem], vazio: "" };
    }

    default:
      return {
        titulo: "Não entendi esse comando",
        itens: COMANDOS_SUGERIDOS,
        vazio: "Experimente um destes comandos:",
      };
  }
}

export interface MensagemPreparada {
  titulo: string;
  corpo: string;
  erro?: string;
}

/** Preenche um modelo de mensagem com os dados reais do paciente (e da
 * próxima consulta, quando houver) para revisão e cópia — nunca envia
 * nada automaticamente. */
export async function prepararMensagemAction(pacienteId: string, chaveModelo: string): Promise<MensagemPreparada> {
  await assertAdmin();
  const supabase = await createClient();

  const [{ data: paciente }, modelos] = await Promise.all([
    supabase.from("pacientes").select("*").eq("id", pacienteId).maybeSingle(),
    listMensagensModelos(),
  ]);
  const modelo = modelos.find((m) => m.chave === chaveModelo);
  if (!paciente) return { titulo: "", corpo: "", erro: "Paciente não encontrado." };
  if (!modelo) return { titulo: "", corpo: "", erro: "Modelo de mensagem não encontrado." };

  const { data: proximaConsulta } = await supabase
    .from("consultas")
    .select("*")
    .eq("auth_id", paciente.auth_id)
    .in("status", ["agendada", "confirmada"])
    .gte("data", new Date().toISOString())
    .order("data", { ascending: true })
    .limit(1)
    .maybeSingle();

  const { data: consultasDoPaciente } = await supabase.from("consultas").select("status").eq("auth_id", paciente.auth_id);
  const stats = computeConsultasStats(paciente, consultasDoPaciente ?? []);
  const dataConsulta = proximaConsulta?.data ? new Date(proximaConsulta.data) : null;

  const corpo = fillTemplate(modelo.corpo, {
    primeiro_nome: primeiroNome(paciente.nome),
    data: dataConsulta ? dataConsulta.toLocaleDateString("pt-BR") : "",
    horario: dataConsulta ? dataConsulta.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "",
    tipo_consulta: proximaConsulta?.tipo ?? "",
    local_ou_link: proximaConsulta?.modalidade ?? "",
    plano: paciente.plano ?? "",
    consultas_realizadas: stats.realizadas,
    consultas_restantes: stats.restantes,
  });

  return { titulo: modelo.titulo, corpo };
}
