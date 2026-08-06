import "server-only";

export type TipoArquivoBiblioteca = "pdf" | "docx" | "html" | "txt" | "imagem";

const EXTENSOES_IMAGEM = ["png", "jpg", "jpeg", "webp", "heic", "heif"] as const;

const MIME_POR_EXTENSAO_IMAGEM: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  heic: "image/heic",
  heif: "image/heif",
};

/** Classifica o arquivo pela extensão (mais confiável que o `type` do
 * browser, que costuma vir vazio/genérico pra alguns formatos). */
export function identificarTipoArquivo(nomeArquivo: string): TipoArquivoBiblioteca | null {
  const ext = nomeArquivo.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "pdf") return "pdf";
  if (ext === "docx") return "docx";
  if (ext === "html" || ext === "htm") return "html";
  if (ext === "txt") return "txt";
  if ((EXTENSOES_IMAGEM as readonly string[]).includes(ext)) return "imagem";
  return null;
}

export function mimeTypeDaImagem(nomeArquivo: string): string {
  const ext = nomeArquivo.split(".").pop()?.toLowerCase() ?? "";
  return MIME_POR_EXTENSAO_IMAGEM[ext] ?? "image/jpeg";
}

/** Extrai texto puro de HTML sem depender de um parser DOM real — o
 * conteúdo só precisa ser legível o suficiente pra IA ler, não uma
 * reconstrução fiel do documento. */
export function extrairTextoDeHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|tr|li|h[1-6])>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Extrai texto de um .docx via `mammoth` (leitura pura, sem preservar
 * formatação — a IA só precisa do conteúdo). */
export async function extrairTextoDeDocx(buffer: Buffer): Promise<string> {
  const mammoth = await import("mammoth");
  const resultado = await mammoth.extractRawText({ buffer });
  return resultado.value.trim();
}
