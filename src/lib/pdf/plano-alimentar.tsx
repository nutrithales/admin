import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

// Cores hard-coded a partir dos mesmos hex de globals.css — o React-PDF
// não lê Tailwind/CSS vars, então isso é o jeito de manter a identidade
// visual consistente entre o painel e o PDF exportado.
const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 10, fontFamily: "Helvetica", color: "#14181A" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    borderBottom: "2px solid #1ADC7F",
    paddingBottom: 10,
  },
  clinicName: { fontSize: 14, fontWeight: 700 },
  title: { fontSize: 18, fontWeight: 700, marginBottom: 3 },
  subtitle: { fontSize: 10, color: "#5B6660", marginBottom: 16 },
  metaRow: { flexDirection: "row", gap: 10, marginBottom: 18 },
  metaBox: { flex: 1, backgroundColor: "#E9FBF1", borderRadius: 6, padding: 8 },
  metaLabel: { fontSize: 7, color: "#0FAE62", textTransform: "uppercase", fontWeight: 700, marginBottom: 2 },
  metaValue: { fontSize: 13, fontWeight: 700 },
  refeicaoTitle: {
    fontSize: 12,
    fontWeight: 700,
    marginTop: 14,
    marginBottom: 5,
    color: "#0FAE62",
    borderBottom: "1px solid #E7EBE9",
    paddingBottom: 3,
  },
  itemRow: { marginBottom: 5 },
  itemName: { fontSize: 10.5, fontWeight: 700 },
  ingredienteLine: { fontSize: 9, color: "#5B6660", marginLeft: 8, marginTop: 1 },
  observacoesBox: { marginTop: 20, padding: 12, backgroundColor: "#F5F8F6", borderRadius: 6, fontSize: 9.5, lineHeight: 1.5 },
  observacoesTitle: { fontSize: 10, fontWeight: 700, marginBottom: 4, color: "#0FAE62" },
});

export interface PlanoPdfItem {
  nome: string;
  quantidade_g?: number;
  ingredientes?: { nome: string; quantidade_g: number }[];
}

export interface PlanoPdfRefeicao {
  nome: string;
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
        <View style={styles.header}>
          <Text style={styles.clinicName}>{data.clinica.nome}</Text>
        </View>

        <Text style={styles.title}>{data.titulo}</Text>
        <Text style={styles.subtitle}>Paciente: {data.paciente.nome}</Text>

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
          <View key={i} wrap={false}>
            <Text style={styles.refeicaoTitle}>{refeicao.nome}</Text>
            {refeicao.itens.map((item, j) => (
              <View key={j} style={styles.itemRow}>
                <Text style={styles.itemName}>
                  {item.nome}
                  {item.quantidade_g != null ? ` — ${Math.round(item.quantidade_g)}g` : ""}
                </Text>
                {item.ingredientes?.map((ing, k) => (
                  <Text key={k} style={styles.ingredienteLine}>
                    • {ing.nome} — {Math.round(ing.quantidade_g)}g
                  </Text>
                ))}
              </View>
            ))}
          </View>
        ))}

        {data.observacoes && (
          <View style={styles.observacoesBox} wrap={false}>
            <Text style={styles.observacoesTitle}>Orientações</Text>
            <Text>{data.observacoes}</Text>
          </View>
        )}
      </Page>
    </Document>
  );
}
