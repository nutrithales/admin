export interface MedidaCaseira {
  unidade: string;
  peso_g: number;
}

export function formatarMedidaCaseira(
  quantidadeG: number | null | undefined,
  medidas: unknown,
): string | null {
  if (!quantidadeG || !Array.isArray(medidas) || medidas.length === 0) return null;

  const validas = medidas.filter(
    (m): m is MedidaCaseira =>
      !!m &&
      typeof m === "object" &&
      typeof (m as MedidaCaseira).unidade === "string" &&
      typeof (m as MedidaCaseira).peso_g === "number" &&
      (m as MedidaCaseira).peso_g > 0,
  );
  if (validas.length === 0) return null;

  const medida = validas.reduce((melhor, atual) => {
    const nMelhor = quantidadeG / melhor.peso_g;
    const nAtual = quantidadeG / atual.peso_g;
    const erroMelhor = Math.abs(nMelhor - Math.round(nMelhor * 2) / 2);
    const erroAtual = Math.abs(nAtual - Math.round(nAtual * 2) / 2);
    return erroAtual < erroMelhor ? atual : melhor;
  });

  const numeroExato = quantidadeG / medida.peso_g;
  const numero = Math.max(0.5, Math.round(numeroExato * 2) / 2);
  const textoNumero = Number.isInteger(numero) ? String(numero) : numero.toFixed(1).replace(".5", "½");

  return `aprox. ${textoNumero} ${medida.unidade.toLowerCase()}`;
}

export function formatarQuantidadeComMedida(
  quantidadeG: number | null | undefined,
  medidas: unknown,
): string {
  const gramas = `${Math.round(quantidadeG ?? 0)} g`;
  const caseira = formatarMedidaCaseira(quantidadeG, medidas);
  return caseira ? `${gramas} (${caseira})` : gramas;
}
