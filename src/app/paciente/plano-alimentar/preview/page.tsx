import Image from "next/image";
import { BRAND_LOGO_DATA_URI } from "@/lib/brand-logo";
import type { PacientePlanoDashboard } from "@/services/paciente-plano.queries";
import { PlanoAlimentarPacienteClient } from "../PlanoAlimentarPacienteClient";

export const metadata = { title: "Prévia do Plano Alimentar" };

const planoExemplo: PacientePlanoDashboard = {
  id: "preview",
  titulo: "Plano alimentar de exemplo",
  pacienteNome: "Paciente Exemplo",
  protocoloNome: "Matriz B - 5 refeições",
  observacoes: "Use este plano como guia principal. Em caso de dúvida sobre horários, substituições ou tolerância alimentar, siga as orientações combinadas em consulta.",
  metas: { kcal: 2200, proteinaG: 125, carboidratoG: 285, gorduraG: 62 },
  refeicoes: [
    {
      id: "cafe",
      nome: "Café da manhã",
      ordem: 1,
      observacoes: "Você pode alternar entre as opções conforme sua rotina.",
      opcoes: [
        {
          numero: 1,
          nome: "Pão com ovos e fruta",
          itens: [
            { id: "cafe-pao", nome: "Pão integral", quantidadeG: 50 },
            { id: "cafe-ovos", nome: "Ovos", quantidadeG: 100 },
            { id: "cafe-banana", nome: "Banana", quantidadeG: 80 },
          ],
        },
        {
          numero: 2,
          nome: "Iogurte, fruta e whey",
          itens: [
            { id: "cafe-iogurte", nome: "Iogurte natural desnatado", quantidadeG: 170 },
            { id: "cafe-whey", nome: "Whey protein", quantidadeG: 25 },
            { id: "cafe-aveia", nome: "Aveia", quantidadeG: 30 },
            { id: "cafe-mamao", nome: "Mamão", quantidadeG: 120 },
          ],
        },
      ],
    },
    {
      id: "almoco",
      nome: "Almoço",
      ordem: 2,
      observacoes: "Vegetais Tipo A são livres. Vegetais Tipo B: 1 porção.",
      opcoes: [
        {
          numero: 1,
          nome: "Prato com feijão",
          itens: [
            { id: "almoco-arroz", nome: "Arroz branco cozido", quantidadeG: 140 },
            { id: "almoco-feijao", nome: "Feijão carioca", quantidadeG: 80 },
            { id: "almoco-frango", nome: "Peito de frango grelhado", quantidadeG: 130 },
            { id: "almoco-vega", nome: "Vegetais Tipo A", quantidadeTexto: "livre", papelMacro: "livre" },
            { id: "almoco-vegb", nome: "Vegetais Tipo B", quantidadeTexto: "1 porção", papelMacro: "vegetal_b" },
          ],
        },
        {
          numero: 2,
          nome: "Prato sem feijão",
          itens: [
            { id: "almoco2-arroz", nome: "Arroz branco cozido", quantidadeG: 160 },
            { id: "almoco2-carne", nome: "Patinho moído", quantidadeG: 130 },
            { id: "almoco2-vega", nome: "Vegetais Tipo A", quantidadeTexto: "livre", papelMacro: "livre" },
          ],
        },
      ],
    },
    {
      id: "pre",
      nome: "Pré-treino",
      ordem: 3,
      opcoes: [
        {
          numero: 1,
          nome: "Pão com doce de leite",
          itens: [
            { id: "pre-pao", nome: "Pão", quantidadeG: 50 },
            { id: "pre-doce", nome: "Doce de leite", quantidadeG: 20 },
          ],
        },
        {
          numero: 2,
          nome: "Banana com pasta de amendoim",
          itens: [
            { id: "pre-banana", nome: "Banana", quantidadeG: 100 },
            { id: "pre-pasta", nome: "Pasta de amendoim", quantidadeG: 10 },
          ],
        },
      ],
    },
    {
      id: "jantar",
      nome: "Jantar",
      ordem: 4,
      opcoes: [
        {
          numero: 1,
          nome: "Prato com feijão",
          itens: [
            { id: "jantar-arroz", nome: "Arroz branco cozido", quantidadeG: 100 },
            { id: "jantar-feijao", nome: "Feijão carioca", quantidadeG: 80 },
            { id: "jantar-frango", nome: "Peito de frango grelhado", quantidadeG: 120 },
            { id: "jantar-vega", nome: "Vegetais Tipo A", quantidadeTexto: "livre", papelMacro: "livre" },
          ],
        },
      ],
    },
  ],
  substituicoes: [
    { itemId: "almoco-arroz", grupo: "Carboidratos de almoço e jantar", nome: "Batata inglesa cozida", quantidadeG: 300 },
    { itemId: "almoco-arroz", grupo: "Carboidratos de almoço e jantar", nome: "Batata-doce cozida", quantidadeG: 250 },
    { itemId: "almoco-arroz", grupo: "Carboidratos de almoço e jantar", nome: "Mandioca cozida", quantidadeG: 170 },
    { itemId: "almoco-arroz", grupo: "Carboidratos de almoço e jantar", nome: "Macarrão cozido", quantidadeG: 180 },
    { itemId: "almoco-frango", grupo: "Proteínas de almoço e jantar", nome: "Tilápia grelhada", quantidadeG: 160 },
    { itemId: "almoco-frango", grupo: "Proteínas de almoço e jantar", nome: "Patinho grelhado", quantidadeG: 125 },
    { itemId: "almoco-frango", grupo: "Proteínas de almoço e jantar", nome: "Lombo suíno", quantidadeG: 135 },
    { itemId: "cafe-banana", grupo: "Frutas", nome: "Mamão", quantidadeG: 160 },
    { itemId: "cafe-banana", grupo: "Frutas", nome: "Maçã", quantidadeG: 110 },
    { itemId: "cafe-banana", grupo: "Frutas", nome: "Morangos", quantidadeG: 220 },
    { itemId: "jantar-arroz", grupo: "Carboidratos de almoço e jantar", nome: "Batata inglesa cozida", quantidadeG: 215 },
    { itemId: "jantar-arroz", grupo: "Carboidratos de almoço e jantar", nome: "Mandioca cozida", quantidadeG: 120 },
  ],
};

export default function PreviewPlanoAlimentarPage() {
  return (
    <main className="min-h-screen bg-bg px-4 py-5 sm:py-8">
      <div className="mx-auto max-w-3xl">
        <header className="mb-5 flex items-center justify-between gap-4">
          <span className="rounded-full bg-brand-light px-3 py-2 text-xs font-bold uppercase tracking-[0.12em] text-brand-dark">Prévia</span>
          <Image src={BRAND_LOGO_DATA_URI} alt="Nutri Thales Rosa" width={118} height={42} className="h-auto w-[118px] object-contain" unoptimized priority />
        </header>
        <PlanoAlimentarPacienteClient plano={planoExemplo} />
      </div>
    </main>
  );
}
