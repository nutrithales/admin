import Image from "next/image";
import { BRAND_LOGO_DATA_URI } from "@/lib/brand-logo";
import type { PacientePlanoDashboard } from "@/services/paciente-plano.queries";
import { PlanoAlimentarPacienteClient } from "../paciente/plano-alimentar/PlanoAlimentarPacienteClient";

export const metadata = { title: "Prévia do Plano Alimentar" };

const planoExemplo: PacientePlanoDashboard = {
  id: "preview",
  titulo: "Plano alimentar",
  pacienteNome: "Paciente Exemplo",
  protocoloNome: null,
  observacoes: "Use este plano como guia principal. Em caso de dúvida sobre horários, substituições ou tolerância alimentar, siga as orientações combinadas em consulta.",
  metas: { kcal: 2200, proteinaG: 125, carboidratoG: 285, gorduraG: 62 },
  refeicoes: [
    { id: "pre", nome: "Pré-treino", ordem: 0, opcoes: [
      { numero: 1, nome: "Pão com doce de leite", itens: [{ id: "pre-pao", nome: "Pão", quantidadeG: 25, medidaCaseira: "≈ 1 fatia" }, { id: "pre-doce", nome: "Doce de leite", quantidadeG: 20, medidaCaseira: "≈ 1 colher de sobremesa" }]},
      { numero: 2, nome: "Banana com pasta de amendoim", itens: [{ id: "pre-banana", nome: "Banana", quantidadeG: 100, medidaCaseira: "≈ 1 unidade média" }, { id: "pre-pasta", nome: "Pasta de amendoim", quantidadeG: 10, medidaCaseira: "≈ 1 colher de sobremesa rasa" }]},
    ]},
    { id: "cafe", nome: "Café da manhã", ordem: 1, observacoes: "Você pode alternar entre as opções conforme sua rotina.", opcoes: [
      { numero: 1, nome: "Pão com ovos e fruta", itens: [
        { id: "cafe-pao", nome: "Pão integral", quantidadeG: 50, medidaCaseira: "≈ 2 fatias" }, { id: "cafe-ovos", nome: "Ovos", quantidadeG: 100, medidaCaseira: "≈ 2 unidades" }, { id: "cafe-banana", nome: "Banana", quantidadeG: 80, medidaCaseira: "≈ 1 unidade pequena" },
      ]},
      { numero: 2, nome: "Iogurte, fruta e whey", itens: [
        { id: "cafe-iogurte", nome: "Iogurte natural desnatado", quantidadeG: 170, medidaCaseira: "≈ 1 pote" }, { id: "cafe-whey", nome: "Whey protein", quantidadeG: 25, medidaCaseira: "≈ 1 dosador" }, { id: "cafe-aveia", nome: "Aveia", quantidadeG: 30, medidaCaseira: "≈ 3 colheres de sopa" }, { id: "cafe-mamao", nome: "Mamão", quantidadeG: 120, medidaCaseira: "≈ 1/2 unidade pequena" },
      ]},
    ]},
    { id: "almoco", nome: "Almoço", ordem: 2, observacoes: "Organize proteína e carboidrato em porções para facilitar a semana.", opcoes: [
      { numero: 1, nome: "Prato com feijão", itens: [
        { id: "almoco-arroz", nome: "Arroz branco cozido", quantidadeG: 140, medidaCaseira: "≈ 4 colheres de sopa cheias" }, { id: "almoco-feijao", nome: "Feijão carioca", quantidadeG: 80, medidaCaseira: "≈ 1 concha pequena" }, { id: "almoco-frango", nome: "Peito de frango grelhado", quantidadeG: 130, medidaCaseira: "≈ 1 filé médio" }, { id: "almoco-vega", nome: "Vegetais Tipo A", quantidadeTexto: "livre", papelMacro: "livre" }, { id: "almoco-vegb", nome: "Vegetais Tipo B", quantidadeTexto: "1 porção", papelMacro: "vegetal_b" },
      ]},
      { numero: 2, nome: "Prato sem feijão", itens: [
        { id: "almoco2-arroz", nome: "Arroz branco cozido", quantidadeG: 160, medidaCaseira: "≈ 5 colheres de sopa" }, { id: "almoco2-carne", nome: "Patinho moído", quantidadeG: 130, medidaCaseira: "≈ 5 colheres de sopa" }, { id: "almoco2-vega", nome: "Vegetais Tipo A", quantidadeTexto: "livre", papelMacro: "livre" }, { id: "almoco2-vegb", nome: "Vegetais Tipo B", quantidadeTexto: "1 porção", papelMacro: "vegetal_b" },
      ]},
    ]},
    { id: "jantar", nome: "Jantar", ordem: 3, opcoes: [
      { numero: 1, nome: "Prato com feijão", itens: [{ id: "jantar-arroz", nome: "Arroz branco cozido", quantidadeG: 100, medidaCaseira: "≈ 3 colheres de sopa" }, { id: "jantar-feijao", nome: "Feijão carioca", quantidadeG: 80, medidaCaseira: "≈ 1 concha pequena" }, { id: "jantar-frango", nome: "Peito de frango grelhado", quantidadeG: 120, medidaCaseira: "≈ 1 filé médio" }, { id: "jantar-vega", nome: "Vegetais Tipo A", quantidadeTexto: "livre", papelMacro: "livre" }, { id: "jantar-vegb", nome: "Vegetais Tipo B", quantidadeTexto: "1 porção", papelMacro: "vegetal_b" }]},
    ]},
  ],
  substituicoes: [
    { itemId: "pre-pao", grupo: "Carboidratos de café e lanches", nome: "Tapioca", quantidadeG: 17, medidaCaseira: "≈ 1/3 unidade média" },
    { itemId: "almoco-arroz", grupo: "Carboidratos de almoço e jantar", nome: "Batata inglesa cozida", quantidadeG: 300, medidaCaseira: "≈ 2 unidades médias" },
    { itemId: "almoco-arroz", grupo: "Carboidratos de almoço e jantar", nome: "Batata-doce cozida", quantidadeG: 250, medidaCaseira: "≈ 1 unidade grande" },
    { itemId: "almoco-arroz", grupo: "Carboidratos de almoço e jantar", nome: "Mandioca cozida", quantidadeG: 170, medidaCaseira: "≈ 3 pedaços" },
    { itemId: "almoco-frango", grupo: "Proteínas de almoço e jantar", nome: "Tilápia grelhada", quantidadeG: 160, medidaCaseira: "≈ 1 filé grande" },
    { itemId: "almoco-frango", grupo: "Proteínas de almoço e jantar", nome: "Patinho grelhado", quantidadeG: 125, medidaCaseira: "≈ 1 bife médio" },
    { itemId: "cafe-banana", grupo: "Frutas", nome: "Mamão", quantidadeG: 160, medidaCaseira: "≈ 1/2 unidade" },
    { itemId: "cafe-banana", grupo: "Frutas", nome: "Maçã", quantidadeG: 110, medidaCaseira: "≈ 1 unidade pequena" },
    { itemId: "jantar-arroz", grupo: "Carboidratos de almoço e jantar", nome: "Batata inglesa cozida", quantidadeG: 215, medidaCaseira: "≈ 1 unidade grande" },
  ],
  vegetais: {
    tipoA: [
      { nome: "Alface" }, { nome: "Rúcula" }, { nome: "Agrião" }, { nome: "Pepino" }, { nome: "Tomate" }, { nome: "Abobrinha" }, { nome: "Berinjela" }, { nome: "Brócolis" }, { nome: "Couve-flor" }, { nome: "Repolho" }, { nome: "Couve" }, { nome: "Cogumelos" },
    ],
    tipoB: [
      { nome: "Cenoura cozida", porcaoG: 80 }, { nome: "Beterraba cozida", porcaoG: 80 }, { nome: "Abóbora cabotiá cozida", porcaoG: 100 }, { nome: "Ervilha fresca cozida", porcaoG: 60 }, { nome: "Milho cozido", porcaoG: 60 }, { nome: "Vagem cozida", porcaoG: 100 },
    ],
  },
};

export default function PreviewPlanoAlimentarPublicoPage() {
  return (
    <main className="min-h-screen bg-bg px-4 py-5 sm:py-8">
      <div className="mx-auto max-w-3xl">
        <header className="mb-5 flex items-center justify-between gap-4">
          <span className="rounded-full bg-brand-light px-3 py-2 text-xs font-bold uppercase tracking-[0.12em] text-brand-dark">Prévia pública</span>
          <Image src={BRAND_LOGO_DATA_URI} alt="Nutri Thales Rosa" width={118} height={42} className="h-auto w-[118px] object-contain" unoptimized priority />
        </header>
        <PlanoAlimentarPacienteClient plano={planoExemplo} />
      </div>
    </main>
  );
}
