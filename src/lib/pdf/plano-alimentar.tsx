import "server-only";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

const FONTE_DISPLAY = "Helvetica";

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
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 4 },
  clinicName: { fontFamily: FONTE_DISPLAY, fontWeight: 700, fontSize: 15, color: COR_INK_PROFUNDO },
  headerTag: { fontSize: 8, color: COR_MUTED, textTransform: "uppercase", letterSpacing: 1 },
  headerRule: { height: 3, backgroundColor: COR_BRAND, borderRadius: 2, marginTop: 10, marginBottom: 20 },
  titleBlock: { backgroundColor: COR_INK_PROFUNDO, borderRadius: 10, padding: 16, marginBottom: 18 },
  title: { fontFamily: FONTE_DISPLAY, fontWeight: 700, fontSize: 17, color: "#FFFFFF", marginBottom: 3 },
  subtitle: { fontSize: 9.5, color: "#B7C4BD" },
  metaRow: { flexDirection: "row", gap: 8, marginBottom: 20 },
  metaBox: { flex: 1, backgroundColor: COR_BG_ALT, borderRadius: 8, paddingVertical: 10, paddingHorizontal: 8 },
  metaLabel: { fontSize: 7, color: COR_BRAND_ESCURO, textTransform: "uppercase", fontWeight: 700, letterSpacing: 0.5, marginBottom: 3 },
  metaValue: { fontFamily: FONTE_DISPLAY, fontWeight: 700, fontSize: 15, color: COR_INK_PROFUNDO },
  refeicaoBloco: { marginBottom: 16 },
  refeicaoTitleRow: { flexDirection: "row", alignItems: "center", marginBottom: 7, borderBottom: `1px solid ${COR_BORDA}`, paddingBottom: 5 },
  refeicaoDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COR_BRAND, marginRight: 6 },
  refeicaoTitle: { fontFamily: FONTE_DISPLAY, fontWeight: 700, fontSize: 11.5, color: COR_INK_PROFUNDO },
  escolhaText: { fontSize: 8, color: COR_MUTED, marginBottom: 7, marginLeft: 12 },
  opcaoBox: { marginLeft: 12, marginBottom: 9, padding: 9, borderRadius: 7, backgroundColor: COR_BG_ALT_2, border: `1px solid ${COR_BORDA}` },
  opcaoHeader: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  opcaoBadge: { fontSize: 7.5, fontWeight: 700, color: COR_BRAND_ESCURO, marginRight: 5 },
  opcaoNome: { fontSize: 9, fontWeight: 700, color: COR_INK_PROFUNDO },
  itemRow: { marginBottom: 5 },
  itemName: { fontSize: 9.5, fontWeight: 700, color: COR_INK },
  itemQuantidade: { fontWeight: 400, color: COR_MUTED },
  ingredienteLine: { fontSize: 8.3, color: COR_MUTED, marginLeft: 10, marginTop: 2 },
  refeicaoObservacoesBox: { marginTop: 6, marginLeft: 12, padding: 8, backgroundColor: COR_BG_ALT_2, borderRadius: 6, borderLeft: `2px solid ${COR_BRAND}` },
  refeicaoObservacoesText: { fontSize: 8.2, lineHeight: 1.45, color: COR_MUTED },
  observacoesBox: { marginTop: 22, padding: 14, backgroundColor: COR_BG_ALT_2, borderRadius: 10, borderLeft: `3px solid ${COR_BRAND}` },
  observacoesTitle: { fontFamily: FONTE_DISPLAY, fontWeight: 700, fontSize: 10.5, marginBottom: 5, color: COR_BRAND_ESCURO },
  observacoesText: { fontSize: 9.5, lineHeight: 1.55, color: COR_INK },
  anexoIntro: { fontSize: 9.5, lineHeight: 1.45, color: COR_MUTED, marginBottom: 16 },
  anexoRefeicao: { marginBottom: 18 },
  anexoRefeicaoTitulo: { fontFamily: FONTE_DISPLAY, fontWeight: 700, fontSize: 13, color: COR_INK_PROFUNDO, borderBottom: `2px solid ${COR_BRAND}`, paddingBottom: 5, marginBottom: 9 },
  anexoOpcao: { fontSize: 8, color: COR_BRAND_ESCURO, fontWeight: 700, textTransform: "uppercase", marginBottom: 6 },
  anexoGrupo: { padding: 9, marginBottom: 8, borderRadius: 7, border: `1px solid ${COR_BORDA}`, backgroundColor: COR_BG_ALT_2 },
  anexoOrigem: { fontSize: 9.2, fontWeight: 700, color: COR_INK_PROFUNDO, marginBottom: 3 },
  anexoGrupoNome: { fontSize: 7.8, color: COR_MUTED, marginBottom: 6 },
  anexoSub: { fontSize: 8.5, color: COR_INK, marginBottom: 3 },
  anexoNota: { fontSize: 7.8, color: COR_MUTED, lineHeight: 1.4, marginTop: 8 },
  footer: { position: "absolute", bottom: 18, left: 36, right: 36, flexDirection: "row", justifyContent: "space-between", borderTop: `1px solid ${COR_BORDA}`, paddingTop: 8 },
  footerText: { fontSize: 7.5, color: COR_MUTED_CLARO },
});

export interface PlanoPdfItem {
  nome: string;
  quantidade_g?: number;
  quantidade_texto?: string;
  ingredientes?: { nome: string; quantidade_g: number }[];
}

export interface PlanoPdfOpcao {
  numero: number;
  nome?: string | null;
  itens: PlanoPdfItem[];
}

export interface PlanoPdfRefeicao {
  nome: string;
  observacoes?: string | null;
  opcoes: PlanoPdfOpcao[];
}

export interface PlanoPdfSubstituicaoGrupo {
  refeicao: string;
  refeicaoOrdem: number;
  opcaoNumero: number;
  opcaoNome?: string | null;
  alimentoOrigem: string;
  quantidadeOrigemG: number;
  grupoNome: string;
  substituicoes: { nome: string; quantidadeG: number }[];
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
  substituicoes?: PlanoPdfSubstituicaoGrupo[];
}

function Rodape({ nome }: { nome: string }) {
  return (
    <View style={styles.footer} fixed>
      <Text style={styles.footerText}>{nome}</Text>
      <Text style={styles.footerText} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
    </View>
  );
}

export function PlanoAlimentarPdf({ data }: { data: PlanoPdfData }) {
  const refeicoesSubstituicao = new Map<string, PlanoPdfSubstituicaoGrupo[]>();
  for (const grupo of data.substituicoes ?? []) {
    const chave = `${grupo.refeicaoOrdem}:${grupo.refeicao}`;
    refeicoesSubstituicao.set(chave, [...(refeicoesSubstituicao.get(chave) ?? []), grupo]);
  }

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
            {data.metas.kcal != null && <View style={styles.metaBox}><Text style={styles.metaLabel}>Kcal</Text><Text style={styles.metaValue}>{Math.round(data.metas.kcal)}</Text></View>}
            {data.metas.proteina_g != null && <View style={styles.metaBox}><Text style={styles.metaLabel}>Proteína</Text><Text style={styles.metaValue}>{Math.round(data.metas.proteina_g)}g</Text></View>}
            {data.metas.carboidrato_g != null && <View style={styles.metaBox}><Text style={styles.metaLabel}>Carboidrato</Text><Text style={styles.metaValue}>{Math.round(data.metas.carboidrato_g)}g</Text></View>}
            {data.metas.gordura_g != null && <View style={styles.metaBox}><Text style={styles.metaLabel}>Gordura</Text><Text style={styles.metaValue}>{Math.round(data.metas.gordura_g)}g</Text></View>}
          </View>
        )}

        {data.refeicoes.map((refeicao, i) => (
          <View key={i} style={styles.refeicaoBloco}>
            <View style={styles.refeicaoTitleRow}>
              <View style={styles.refeicaoDot} />
              <Text style={styles.refeicaoTitle}>{refeicao.nome}</Text>
            </View>
            {refeicao.opcoes.length > 1 && <Text style={styles.escolhaText}>Escolha uma das opções abaixo.</Text>}
            {refeicao.opcoes.map((opcao) => (
              <View key={opcao.numero} style={styles.opcaoBox} wrap={false}>
                <View style={styles.opcaoHeader}>
                  <Text style={styles.opcaoBadge}>OPÇÃO {opcao.numero}</Text>
                  <Text style={styles.opcaoNome}>{opcao.nome || (opcao.numero === 1 ? "Principal" : "Alternativa")}</Text>
                </View>
                {opcao.itens.map((item, j) => (
                  <View key={j} style={styles.itemRow}>
                    <Text style={styles.itemName}>
                      {item.nome}
                      {item.quantidade_texto ? <Text style={styles.itemQuantidade}> ({item.quantidade_texto})</Text> : item.quantidade_g != null ? <Text style={styles.itemQuantidade}> ({Math.round(item.quantidade_g)}g)</Text> : ""}
                    </Text>
                    {item.ingredientes?.map((ing, k) => <Text key={k} style={styles.ingredienteLine}>• {ing.nome} ({Math.round(ing.quantidade_g)}g)</Text>)}
                  </View>
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

        <Rodape nome={data.clinica.nome} />
      </Page>

      {(data.substituicoes?.length ?? 0) > 0 && (
        <Page size="A4" style={styles.page} wrap>
          <View style={styles.header} fixed>
            <Text style={styles.clinicName}>{data.clinica.nome}</Text>
            <Text style={styles.headerTag}>Substituições</Text>
          </View>
          <View style={styles.headerRule} fixed />

          <View style={styles.titleBlock}>
            <Text style={styles.title}>Lista ampliada de substituições</Text>
            <Text style={styles.subtitle}>Porções calculadas a partir deste plano para {data.paciente.nome}</Text>
          </View>
          <Text style={styles.anexoIntro}>
            Use as quantidades indicadas para substituir o alimento correspondente dentro da mesma refeição e opção. As equivalências são calculadas a partir da porção prescrita no plano e podem ser diferentes entre almoço, jantar, café da manhã e lanches.
          </Text>

          {[...refeicoesSubstituicao.entries()].map(([chave, grupos]) => {
            const primeiroGrupo = grupos[0];
            if (!primeiroGrupo) return null;
            return (
              <View key={chave} style={styles.anexoRefeicao}>
                <Text style={styles.anexoRefeicaoTitulo}>{primeiroGrupo.refeicao}</Text>
                {[...new Set(grupos.map((g) => g.opcaoNumero))].sort((a, b) => a - b).map((opcaoNumero) => {
                  const gruposOpcao = grupos.filter((g) => g.opcaoNumero === opcaoNumero);
                  return (
                    <View key={opcaoNumero}>
                      <Text style={styles.anexoOpcao}>Opção {opcaoNumero}{gruposOpcao[0]?.opcaoNome ? ` - ${gruposOpcao[0].opcaoNome}` : ""}</Text>
                      {gruposOpcao.map((grupo, index) => (
                        <View key={`${grupo.alimentoOrigem}-${index}`} style={styles.anexoGrupo} wrap={false}>
                          <Text style={styles.anexoOrigem}>{grupo.alimentoOrigem}: {Math.round(grupo.quantidadeOrigemG)} g</Text>
                          <Text style={styles.anexoGrupoNome}>{grupo.grupoNome}</Text>
                          {grupo.substituicoes.map((sub, j) => (
                            <Text key={`${sub.nome}-${j}`} style={styles.anexoSub}>• {sub.nome}: {Math.round(sub.quantidadeG)} g</Text>
                          ))}
                        </View>
                      ))}
                    </View>
                  );
                })}
              </View>
            );
          })}

          <Text style={styles.anexoNota}>
            As substituições são referências práticas de equivalência dentro de cada grupo alimentar. Preferências, tolerância gastrointestinal, treino, restrições e contexto clínico continuam prevalecendo sobre a troca automática.
          </Text>
          <Rodape nome={data.clinica.nome} />
        </Page>
      )}
    </Document>
  );
}
