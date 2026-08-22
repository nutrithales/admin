import { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "@/lib/supabase";

type Plan = { titulo: string | null; meta_kcal: number | null; meta_proteina_g: number | null; meta_carboidrato_g: number | null; meta_gordura_g: number | null };

export default function PlanScreen() {
  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("planos_estruturados").select("titulo, meta_kcal, meta_proteina_g, meta_carboidrato_g, meta_gordura_g").eq("status", "finalizado").order("created_at", { ascending: false }).limit(1).maybeSingle().then(({ data }) => {
      setPlan(data);
      setLoading(false);
    });
  }, []);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Plano alimentar</Text>
        <Text style={styles.subtitle}>Seu plano finalizado mais recente.</Text>
        {loading ? <ActivityIndicator /> : plan ? (
          <View style={styles.card}>
            <Text style={styles.name}>{plan.titulo || "Plano alimentar"}</Text>
            <View style={styles.row}>
              <Metric label="kcal" value={plan.meta_kcal} />
              <Metric label="proteína" value={plan.meta_proteina_g} suffix="g" />
              <Metric label="carbo" value={plan.meta_carboidrato_g} suffix="g" />
              <Metric label="gordura" value={plan.meta_gordura_g} suffix="g" />
            </View>
            <Text style={styles.note}>A visualização completa das refeições será a próxima integração do app.</Text>
          </View>
        ) : <Text style={styles.empty}>Nenhum plano finalizado disponível.</Text>}
      </ScrollView>
    </SafeAreaView>
  );
}

function Metric({ label, value, suffix = "" }: { label: string; value: number | null; suffix?: string }) {
  return <View style={styles.metric}><Text style={styles.metricValue}>{value == null ? "—" : `${Math.round(Number(value))}${suffix}`}</Text><Text style={styles.metricLabel}>{label}</Text></View>;
}

const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: "#F6F4EF" }, content: { padding: 22 }, title: { fontSize: 30, fontWeight: "800", color: "#17231B" }, subtitle: { color: "#6B756E", fontSize: 15, marginTop: 6, marginBottom: 22 }, card: { backgroundColor: "#FFFFFF", borderRadius: 22, padding: 20 }, name: { fontSize: 20, fontWeight: "800", color: "#17231B" }, row: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 18 }, metric: { backgroundColor: "#F2F5F1", borderRadius: 16, padding: 12, minWidth: "46%" }, metricValue: { fontSize: 19, fontWeight: "800", color: "#1F4C36" }, metricLabel: { fontSize: 12, color: "#6B756E", marginTop: 2 }, note: { color: "#6B756E", lineHeight: 20, marginTop: 18 }, empty: { color: "#6B756E" } });
