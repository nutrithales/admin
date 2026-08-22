import { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "@/lib/supabase";

type Workout = { id: string; nome: string; objetivo: string | null; bloco: string | null; frequencia_semanal: number | null };

export default function WorkoutScreen() {
  const [items, setItems] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return setLoading(false);
      const { data: patient } = await supabase.from("pacientes").select("id").eq("auth_id", userData.user.id).maybeSingle();
      if (!patient) return setLoading(false);
      const { data } = await supabase.from("treino_programas").select("id, nome, objetivo, bloco, frequencia_semanal").eq("paciente_id", patient.id).order("ordem", { ascending: true });
      setItems(data ?? []);
      setLoading(false);
    }
    load();
  }, []);

  return <SafeAreaView style={styles.safe} edges={["top"]}><ScrollView contentContainerStyle={styles.content}><Text style={styles.title}>Treinos</Text><Text style={styles.subtitle}>Sua programação atual.</Text>{loading ? <ActivityIndicator /> : items.length ? items.map((item) => <View key={item.id} style={styles.card}><Text style={styles.name}>{item.nome}</Text>{item.bloco ? <Text style={styles.tag}>{item.bloco}</Text> : null}{item.objetivo ? <Text style={styles.text}>{item.objetivo}</Text> : null}{item.frequencia_semanal ? <Text style={styles.meta}>{item.frequencia_semanal}x por semana</Text> : null}</View>) : <Text style={styles.empty}>Nenhum treino liberado no momento.</Text>}</ScrollView></SafeAreaView>;
}

const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: "#F6F4EF" }, content: { padding: 22, gap: 12 }, title: { fontSize: 30, fontWeight: "800", color: "#17231B" }, subtitle: { color: "#6B756E", fontSize: 15, marginBottom: 10 }, card: { backgroundColor: "#FFFFFF", borderRadius: 20, padding: 18 }, name: { fontSize: 18, fontWeight: "800", color: "#17231B" }, tag: { alignSelf: "flex-start", marginTop: 8, backgroundColor: "#E8F0EA", color: "#1F4C36", borderRadius: 99, paddingHorizontal: 10, paddingVertical: 5, fontSize: 12, fontWeight: "700" }, text: { color: "#59645D", lineHeight: 20, marginTop: 10 }, meta: { color: "#1F4C36", fontWeight: "700", marginTop: 10 }, empty: { color: "#6B756E" } });
