import type { PacientePlanoDashboard, PacientePlanoItem } from "@/services/paciente-plano.queries";

export type Choice = { option: number; include: boolean; swaps: Record<string, number>; products: Record<string, string> };
export type Week = Record<string, Choice>;
export type Grocery = { name: string; quantity: number; unit: string; preparation?: "rice" | "beans" | "protein"; note?: string };
export const DAYS = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];
export const normalize = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
export const cellKey = (day: number, meal: string) => `${day}:${meal}`;
export function productOptions(name: string): string[] {
  const n = normalize(name);
  if (n.includes("ketchup ou mostarda")) return ["Ketchup", "Mostarda"];
  if (n.includes("patinho ou blend")) return ["Hambúrguer de patinho (cru)", "Hambúrguer de blend magro (cru)"];
  if (n.includes("rap10 ou tortilha")) return ["Rap10", "Tortilha"];
  if (n.includes("fruta de sua preferencia")) return ["Banana prata", "Maçã", "Pera"];
  if (n.includes("castanhas picadas")) return ["Castanhas de caju", "Castanhas-do-pará"];
  return [];
}

// Quantities remain in their prescribed state. Raw purchase estimates are a separate display.
export function ingredients(name: string, q: number, product?: string): Grocery[] {
  const n = normalize(name);
  const g = (name: string, quantity = q, extra: Partial<Grocery> = {}): Grocery => ({ name, quantity, unit: "g", ...extra });
  const u = (name: string, quantity: number, note?: string): Grocery => ({ name, quantity, unit: "un", note });
  if (n.includes("salada") || n.includes("vegetais tipo") || n.includes("cafe preto")) return [{ name, quantity: 0, unit: "livre", note: "À vontade; quantidade não prescrita" }];
  if (n.startsWith("2 ovos inteiros +")) return [u("Ovo", q / 120 * 2), g("Queijo muçarela", q / 120 * 20)];
  if (n.startsWith("peito de peru (60 g)")) return [g("Peito de peru fatiado", q / 110 * 60), u("Ovo", q / 110)];
  if (n.startsWith("arroz cozido (75 g)")) return [g("Arroz cozido", q / 90 * 75, { preparation: "rice" }), g("Farofa", q / 90 * 15)];
  if (n.includes("fruta de sua preferencia")) return [u(product || "Banana prata", q)];
  if (n.includes("ovo inteiro") || n === "ovo cozido") return [u("Ovo", q / 50)];
  if (n.includes("banana prata")) return [u("Banana prata", q / 70, "Referência: 70 g de parte comestível por unidade")];
  if (n === "maca") return [u("Maçã", q / 130)];
  if (n === "pera") return [u("Pera", q / 110)];
  if (n.includes("barra de proteina")) return [u("Barra de proteína (mínimo 15 g de proteína)", q)];
  if (n === "bombom") return [u("Bombom", q)];
  if (n.includes("atum em agua")) return [u("Atum em água — lata pequena", q * 2, "Escorrer antes de consumir; tamanho da lata conforme o plano")];
  if (n.includes("iogurte proteico")) return [u("Iogurte proteico — pote de 160 g", q / 160)];
  if (n.includes("iogurte natural")) return [u("Iogurte natural desnatado — pote de 170 g", q / 170)];
  if (n.includes("pao frances")) return [u("Pão francês — 50 g", q / 50)];
  if (n.includes("pao de hamburguer")) return [u("Pão de hambúrguer — 50 g", q / 50)];
  if (n.includes("pao australiano")) return [u("Pão australiano — 50 g", q / 50)];
  if (n.includes("pao de forma")) return [u("Pão de forma integral — fatia de 25 g", q / 25)];
  if (n.includes("bisnaguinha")) return [u("Bisnaguinha — 20 g", q / 20)];
  if (n.includes("rap10 ou tortilha")) return [u(`${product || "Rap10"} — unidade de 45 g`, q / 45)];
  if (n.includes("leite desnatado")) return [{ name: "Leite desnatado", quantity: q, unit: "ml" }];
  if (n.includes("azeite")) return [{ name: "Azeite de oliva", quantity: q / 0.91, unit: "ml" }];
  if (n.includes("peito de frango pronto")) return [g("Peito de frango pronto", q, { preparation: "protein" })];
  if (n.includes("patinho moido refogado")) return [g("Patinho moído pronto", q, { preparation: "protein" })];
  if (n.includes("carne bovina magra pronta")) return [g("Carne bovina magra pronta", q, { preparation: "protein" })];
  if (n.includes("carne de porco magra pronta")) return [g("Carne suína magra pronta", q, { preparation: "protein" })];
  if (n.includes("peixe grelhado")) return [g("Peixe grelhado", q, { preparation: "protein" })];
  if (n.includes("arroz branco cozido") || n.includes("arroz integral cozido")) return [g(n.includes("integral") ? "Arroz integral cozido" : "Arroz cozido", q, { preparation: "rice" })];
  if (n.includes("feijao cozido com caldo")) return [g("Feijão cozido com caldo", q, { preparation: "beans" })];
  return [g(product || name, q, n.includes("cozid") || n.includes("airfryer") || n.includes("pure") ? { note: "Peso pronto para consumo; rendimento cru não definido" } : {})];
}

export function getSelectedItem(plan: PacientePlanoDashboard, item: PacientePlanoItem, choice: Choice) {
  const alternatives = plan.substituicoes.filter(s => s.itemId === item.id);
  const index = choice.swaps[item.id] ?? -1;
  const sub = index >= 0 ? alternatives[index] : undefined;
  return { name: sub?.nome || item.nome, q: sub?.quantidadeG ?? item.quantidadeG ?? 0, sub };
}

export function buildList(plan: PacientePlanoDashboard, week: Week): Grocery[] {
  const totals = new Map<string, Grocery>();
  for (let day = 0; day < 7; day++) for (const meal of plan.refeicoes) {
    const choice = week[cellKey(day, meal.id)];
    if (!choice?.include) continue;
    const option = meal.opcoes.find(o => o.numero === choice.option);
    if (!option) continue;
    for (const item of option.itens) {
      const selected = getSelectedItem(plan, item, choice);
      const expanded = !selected.sub && item.ingredientes?.length
        ? item.ingredientes.flatMap(i => ingredients(i.nome, i.quantidadeG))
        : ingredients(selected.name, selected.q, choice.products[item.id]);
      for (const row of expanded) {
        const key = `${normalize(row.name)}:${row.unit}`;
        const old = totals.get(key);
        totals.set(key, { ...row, quantity: (old?.quantity || 0) + row.quantity });
      }
    }
  }
  return [...totals.values()].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
}

export const formatQuantity = (row: Grocery) => row.unit === "livre" ? "A definir" : `${row.quantity.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} ${row.unit}`;
