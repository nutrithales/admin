import { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "@/lib/supabase";

type Checkin = { id: number; semana: string; status: string | null; pontuacao: number | null; resumo: string | null };

export default function CheckinScreen() {
  const [items, setItems] = useState<Checkin[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("checkins").select("id, semana, status, pontuacao, resumo").order("semana", { ascending: false }).limit(8).then(({ data }) => {
      setItems(data ?? []);
      setLoading(false);
    });
  }, []);

  return <SafeAreaView style={styles.safe} edges={["top"]}><ScrollView contentContainerStyle={styles.content}><Text style={styles.title}>Check-ins</Text><Text style={styles.subtitle}>Histórico recente do seu acompanhamento.</Text>{loading ? <ActivityIndicator /> : items.length ? items.map((item) => <View key={item.id} style={styles.card}><View style={styles.row}><Text style={styles.date}>{new Date(`${item.semana}T12:00:00`).toLocaleDateString("pt-BR")}</Text><Text style={styles.status}>{item.status || "registrado"}</Text></View>{item.pontuacao != null ? <Text style={styles.score}>Pontuação: {item.pontuacao}</Text> : null}{item.resumo ? <Text style={styles.text}>{item.resumo}</Text> : null}</View>) : <Text style={styles.empty}>Nenhum check-in disponível ainda.</Text>}</ScrollView></SafeAreaView>;
}

const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: "#F6F4EF" }, content: { padding: 22, gap: 12 }, title: { fontSize: 30, fontWeight: "800", color: "#17231B" }, subtitle: { color: "#6B756E", fontSize: 15, marginBottom: 10 }, card: { backgroundColor: "#FFFFFF", borderRadius: 20, padding: 18 }, row: { flexDirection: "row", justifyContent: "space-between", gap: 12 }, date: { fontSize: 16, fontWeight: "800", color: "#17231B" }, status: { fontSize: 12, fontWeight: "700", color: "#1F4C36" }, score: { marginTop: 9, fontWeight: "700", color: "#1F4C36" }, text: { color: "#59645D", lineHeight: 20, marginTop: 8 }, empty: { color: "#6B756E" } });
