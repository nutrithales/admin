export type LeadFollowupFlow = "lead" | "proposta";

export const LEAD_FOLLOWUPS = {
  lead: [
    { dia: 2, etiqueta: "Lead D2", titulo: "Sem resposta · Reativar", mensagem: "Oi, [nome]! Passando para ver se ainda posso te ajudar.\nBoa parte das pessoas me procura depois de tentar resolver sozinha por bastante tempo. Se quiser me contar como está sua situação hoje, te explico como funciona o acompanhamento e a gente vê se faz sentido pra você." },
    { dia: 4, etiqueta: "Lead D4", titulo: "Gerar valor · Quebrar a objeção principal", mensagem: "Uma coisa que vejo muito no consultório:\nA maioria das pessoas não precisa de mais força de vontade. Precisa de um plano que caiba na rotina.\nMuita gente chega achando que vai ter que cortar tudo o que gosta — e se surpreende quando percebe que dá pra emagrecer de um jeito bem mais leve.\nSe ainda estiver procurando ajuda, fico à disposição pra conversar." },
    { dia: 8, etiqueta: "Lead D8", titulo: "Prova social · Mostrar que funciona", mensagem: "Essa semana uma paciente me contou que conseguiu perder peso mesmo com uma rotina super corrida e sem abrir mão dos momentos sociais.\nÉ exatamente esse tipo de estratégia que a gente constrói no acompanhamento — encaixar na vida real, não o contrário." },
    { dia: 14, etiqueta: "Lead D14", titulo: "Pergunta direta · Medir intenção", mensagem: "Oi, [nome]! Como estão as coisas por aí?\nVocê ainda pretende começar algum acompanhamento nutricional nos próximos meses?" },
    { dia: 21, etiqueta: "Lead D21", titulo: "Oferta indireta · Criar oportunidade sem pressão", mensagem: "Oi, [nome]! Estou organizando minha agenda dos próximos atendimentos e lembrei de você.\nAinda tenho alguns horários abertos para avaliação e planejamento nutricional. Se quiser entender melhor como funciona o processo, te explico sem compromisso." },
    { dia: 30, etiqueta: "Lead D30", titulo: "Último contato · Encerrar com porta aberta", mensagem: "Oi, [nome]! Prometo que essa é minha última mensagem por aqui 😊\nSó queria saber se esse objetivo ainda é uma prioridade pra você neste momento.\nSe decidir começar mais pra frente, vai ser um prazer ajudar. E se quiser, posso te deixar na minha lista de conteúdos — mando dicas práticas de vez em quando, sem compromisso nenhum." },
  ],
  proposta: [
    { dia: 1, etiqueta: "Proposta D+1", titulo: "Confirmação leve · Garantir que viu", mensagem: "Oi, [nome]! Te mandei as informações do acompanhamento ali em cima. Conseguiu dar uma olhada?\nQualquer dúvida sobre como funciona ou o que está incluso, é só me chamar." },
    { dia: 3, etiqueta: "Proposta D+3", titulo: "Quebra da objeção de valor", mensagem: "Uma dúvida que aparece bastante nessa etapa é se vale a pena o investimento.\nO que eu costumo dizer: o acompanhamento não é só o plano alimentar — é ter alguém junto ajustando a rota toda semana, nos dias bons e nos difíceis. É isso que faz a diferença entre recomeçar do zero de novo e finalmente manter." },
    { dia: 6, etiqueta: "Proposta D+6", titulo: "Remover a barreira prática", mensagem: "Oi, [nome]! Se for questão de encaixar no momento, a gente consegue pensar junto na melhor forma de começar — inclusive na parte de pagamento ou na data de início.\nMe fala o que faria sentido pra você." },
    { dia: 10, etiqueta: "Proposta D+10", titulo: "Fechamento gentil · Pedir uma definição", mensagem: "Oi, [nome]! Vou organizar minha agenda dos próximos atendimentos. Pra eu não segurar um horário à toa: ainda faz sentido começarmos agora, ou prefere deixar pra mais pra frente? Sem problema nas duas opções." },
  ],
} as const;

export function followupMessage(message: string, nome: string) {
  return message.replaceAll("[nome]", nome.split(" ")[0] || nome);
}

export function nextFollowup(flow: LeadFollowupFlow, inicio: string | null, ultimoDia: number | null, now = new Date()) {
  if (!inicio) return null;
  const start = new Date(inicio);
  const elapsed = Math.floor((now.getTime() - start.getTime()) / 86400000);
  const items = LEAD_FOLLOWUPS[flow];
  const pending = items.find((item) => item.dia > (ultimoDia ?? 0));
  if (!pending) return null;
  const due = new Date(start.getTime() + pending.dia * 86400000);
  return { ...pending, due, vencido: elapsed >= pending.dia };
}
