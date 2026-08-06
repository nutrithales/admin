import "server-only";
import fs from "fs";
import path from "path";
import { Document, Page, Text, View, StyleSheet, Font } from "@react-pdf/renderer";

// Mesma família Galano Grotesque Alt usada no site/painel (src/fonts/index.ts)
// — só os pesos licenciados (700/800/900) valem pra display; o corpo do
// texto continua em Helvetica (embutida no React-PDF, sem risco de
// empacotamento) pra garantir leitura limpa em qualquer leitor de PDF.
// Lido via fs (não `import`) porque o React-PDF precisa do arquivo bruto,
// não de um objeto de font do next/font — ver outputFileTracingIncludes
// em next.config.ts pra esses .otf saírem no bundle da função serverless.
const FONT_DIR = path.join(process.cwd(), "src/fonts");
// `Font.register` aceita Buffer em `src` em tempo de execução (fontkit lê o
// binário direto), mas o tipo declarado pelo @react-pdf/renderer pode só
// cobrir `string` (URL/caminho) — sem node_modules aqui pra conferir, o
// cast evita depender de um tipo que não dá pra confirmar sem rodar o
// build (mesmo raciocínio do `PdfDocumentElement` em planos-pdf.actions.ts).
function registrarGalano() {
  try {
    const config = {
      family: "Galano",
      fonts: [
        { src: fs.readFileSync(path.join(FONT_DIR, "GalanoGrotesqueAlt-Bold.otf")), fontWeight: 700 },
        { src: fs.readFileSync(path.join(FONT_DIR, "GalanoGrotesqueAlt-ExtraBold.otf")), fontWeight: 800 },
        { src: fs.readFileSync(path.join(FONT_DIR, "GalanoGrotesqueAlt-Black.otf")), fontWeight: 900 },
      ],
    };
    Font.register(config as unknown as Parameters<typeof Font.register>[0]);
    return true;
  } catch {
    // Se o arquivo não estiver disponível no ambiente de execução (ex.:
    // tracing incompleto) ou o formato não for aceito, cai pra Helvetica
    // sem quebrar o PDF — ver também o try/catch em torno de
    // `renderToBuffer` em planos-pdf.actions.ts, segunda rede de segurança.
    return false;
  }
}
const galanoDisponivel = registrarGalano();
const FONTE_DISPLAY = galanoDisponivel ? "Galano" : "Helvetica";

// Paleta igual à do painel (src/app/globals.css) — mantém a identidade
// visual consistente entre o app e o PDF exportado.
const COR_BRAND = "#1ADC7F";
const COR_BRAND_ESCURO = "#0FAE62";
const COR_INK = "#14181A";
const COR_INK_PROFUNDO = "#04140C";
const COR_MUTED = "#5B6660";
const COR_MUTED_CLARO = "#8B948F";
const COR_BORDA = "#E7EBE9";
const COR_BG_ALT = "#F0F5F2";
const COR_BG_ALT_2 = "#F5F8F6";

const styles = StyleSheet.create({
  page: { paddingTop: 36, paddingBottom: 44, paddingHorizontal: 36, fontSize: 10, fontFamily: "Helvetica", color: COR_INK },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 4,
  },
  clinicName: { fontFamily: FONTE_DISPLAY, fontWeight: galanoDisponivel ? 900 : 700, fontSize: 15, color: COR_INK_PROFUNDO },
  headerTag: { fontSize: 8, color: COR_MUTED, textTransform: "uppercase", letterSpacing: 1 },
  headerRule: { height: 3, backgroundColor: COR_BRAND, borderRadius: 2, marginTop: 10, marginBottom: 20 },
  titleBlock: {
    backgroundColor: COR_INK_PROFUNDO,
    borderRadius: 10,
    padding: 16,
    marginBottom: 18,
  },
  title: { fontFamily: FONTE_DISPLAY, fontWeight: galanoDisponivel ? 800 : 700, fontSize: 17, color: "#FFFFFF", marginBottom: 3 },
  subtitle: { fontSize: 9.5, color: "#B7C4BD" },
  metaRow: { flexDirection: "row", gap: 8, marginBottom: 20 },
  metaBox: { flex: 1, backgroundColor: COR_BG_ALT, borderRadius: 8, paddingVertical: 10, paddingHorizontal: 8 },
  metaLabel: { fontSize: 7, color: COR_BRAND_ESCURO, textTransform: "uppercase", fontWeight: 700, letterSpacing: 0.5, marginBottom: 3 },
  metaValue: { fontFamily: FONTE_DISPLAY, fontWeight: galanoDisponivel ? 800 : 700, fontSize: 15, color: COR_INK_PROFUNDO },
  refeicaoBloco: { marginBottom: 14 },
  refeicaoTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 7,
    borderBottom: `1px solid ${COR_BORDA}`,
    paddingBottom: 5,
  },
  refeicaoDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COR_BRAND, marginRight: 6 },
  refeicaoTitle: { fontFamily: FONTE_DISPLAY, fontWeight: galanoDisponivel ? 800 : 700, fontSize: 11.5, color: COR_INK_PROFUNDO },
  itemRow: { marginBottom: 6, paddingLeft: 12 },
  itemName: { fontSize: 10, fontWeight: 700, color: COR_INK },
  itemQuantidade: { fontWeight: 400, color: COR_MUTED },
  ingredienteLine: { fontSize: 8.7, color: COR_MUTED, marginLeft: 10, marginTop: 2 },
  refeicaoObservacoesBox: {
    marginTop: 6,
    marginLeft: 12,
    padding: 8,
    backgroundColor: COR_BG_ALT_2,
    borderRadius: 6,
    borderLeft: `2px solid ${COR_BRAND}`,
  },
  refeicaoObservacoesText: { fontSize: 8.5, lineHeight: 1.45, color: COR_MUTED },
  observacoesBox: { marginTop: 22, padding: 14, backgroundColor: COR_BG_ALT_2, borderRadius: 10, borderLeft: `3px solid ${COR_BRAND}` },
  observacoesTitle: { fontFamily: FONTE_DISPLAY, fontWeight: galanoDisponivel ? 800 : 700, fontSize: 10.5, marginBottom: 5, color: COR_BRAND_ESCURO },
  observacoesText: { fontSize: 9.5, lineHeight: 1.55, color: COR_INK },
  footer: {
    position: "absolute",
    bottom: 18,
    left: 36,
    right: 36,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTop: `1px solid ${COR_BORDA}`,
    paddingTop: 8,
  },
  footerText: { fontSize: 7.5, color: COR_MUTED_CLARO },
});

export interface PlanoPdfItem {
  nome: string;
  quantidade_g?: number;
  ingredientes?: { nome: string; quantidade_g: number }[];
}

export interface PlanoPdfRefeicao {
  nome: string;
  observacoes?: string | null;
  itens: PlanoPdfItem[];
}

export interface PlanoPdfData {
  clinica: { nome: string };
  paciente: { nome: string };
  titulo: string;
  metas: {
    kcal?: number | null;
    proteina_g?: number | null;
    carboidrato_g?: number | null;
    gordura_g?: number | null;
  };
  observacoes?: string | null;
  refeicoes: PlanoPdfRefeicao[];
}

export function PlanoAlimentarPdf({ data }: { data: PlanoPdfData }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header} fixed>
          <Text style={styles.clinicName}>{data.clinica.nome}</Text>
          <Text style={styles.headerTag}>Plano alimentar</Text>
        </View>
        <View style={styles.headerRule} fixed />

        <View style={styles.titleBlock}>
          <Text style={styles.title}>{data.titulo}</Text>
          <Text style={styles.subtitle}>Paciente: {data.paciente.nome}</Text>
        </View>

        {(data.metas.kcal != null || data.metas.proteina_g != null || data.metas.carboidrato_g != null || data.metas.gordura_g != null) && (
          <View style={styles.metaRow}>
            {data.metas.kcal != null && (
              <View style={styles.metaBox}>
                <Text style={styles.metaLabel}>Kcal</Text>
                <Text style={styles.metaValue}>{Math.round(data.metas.kcal)}</Text>
              </View>
            )}
            {data.metas.proteina_g != null && (
              <View style={styles.metaBox}>
                <Text style={styles.metaLabel}>Proteína</Text>
                <Text style={styles.metaValue}>{Math.round(data.metas.proteina_g)}g</Text>
              </View>
            )}
            {data.metas.carboidrato_g != null && (
              <View style={styles.metaBox}>
                <Text style={styles.metaLabel}>Carboidrato</Text>
                <Text style={styles.metaValue}>{Math.round(data.metas.carboidrato_g)}g</Text>
              </View>
            )}
            {data.metas.gordura_g != null && (
              <View style={styles.metaBox}>
                <Text style={styles.metaLabel}>Gordura</Text>
                <Text style={styles.metaValue}>{Math.round(data.metas.gordura_g)}g</Text>
              </View>
            )}
          </View>
        )}

        {data.refeicoes.map((refeicao, i) => (
          <View key={i} style={styles.refeicaoBloco} wrap={false}>
            <View style={styles.refeicaoTitleRow}>
              <View style={styles.refeicaoDot} />
              <Text style={styles.refeicaoTitle}>{refeicao.nome}</Text>
            </View>
            {refeicao.itens.map((item, j) => (
              <View key={j} style={styles.itemRow}>
                <Text style={styles.itemName}>
                  {item.nome}
                  {item.quantidade_g != null ? <Text style={styles.itemQuantidade}> ({Math.round(item.quantidade_g)}g)</Text> : ""}
                </Text>
                {item.ingredientes?.map((ing, k) => (
                  <Text key={k} style={styles.ingredienteLine}>
                    • {ing.nome} ({Math.round(ing.quantidade_g)}g)
                  </Text>
                ))}
              </View>
            ))}
            {refeicao.observacoes && (
              <View style={styles.refeicaoObservacoesBox}>
                <Text style={styles.refeicaoObservacoesText}>{refeicao.observacoes}</Text>
              </View>
            )}
          </View>
        ))}

        {data.observacoes && (
          <View style={styles.observacoesBox} wrap={false}>
            <Text style={styles.observacoesTitle}>Orientações</Text>
            <Text style={styles.observacoesText}>{data.observacoes}</Text>
          </View>
        )}

        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>{data.clinica.nome}</Text>
          <Text style={styles.footerText} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
