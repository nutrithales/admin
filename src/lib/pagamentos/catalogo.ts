export const SERVICOS = {
  consulta_avulsa: { label: "Consulta Avulsa", descricao: "Prestação de serviço de assessoria e acompanhamento em condicionamento físico geral, correspondente a 1 (uma) consulta individual, conforme contratação de Consulta Avulsa." },
  plano_essencial: { label: "Plano Essencial", descricao: "Consultas de assessoria e acompanhamento em condicionamento físico geral, correspondentes a 3 (três) sessões, com prazo de utilização de até 4 (quatro) meses, conforme Plano Essencial." },
  plano_evolucao: { label: "Plano Evolução", descricao: "Prestação de serviços de assessoria e acompanhamento em condicionamento físico geral, correspondentes a 6 (seis) consultas, com prazo de utilização de até 8 (oito) meses, conforme Plano Evolução." },
  plano_elite_premium: { label: "Plano Elite Premium", descricao: "Prestação de serviços de assessoria e acompanhamento em condicionamento físico geral, correspondentes a 9 (nove) consultas, com prazo de utilização de até 12 (doze) meses, conforme Plano Elite Premium." },
} as const;
export type ServicoKey = keyof typeof SERVICOS;