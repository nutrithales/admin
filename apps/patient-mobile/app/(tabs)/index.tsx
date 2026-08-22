import { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "@/lib/supabase";

type Patient = { nome: string; plano: string | null; objetivo: string | null };
type Consultation = { data: string; tipo: string | null };

export default function HomeScreen() {
  const [patient, setPatient] = useState<Patient | null>(null);
  const [consultation, setConsultation] = useState<Consultation | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) return setLoading(false);

      const [{ data: patientData }, { data: consultationData }] = await Promise.all([
        supabase.from("pacientes").select("nome, plano, objetivo").eq("auth_id", user.id).maybeSingle(),
        supabase.from("consultas").select("data, tipo").eq("auth_id", user.id).gte("data", new Date().toISOString()).order("data", { ascending: true }).limit(1).maybeSingle(),
      ]);

      setPatient(patientData);
      setConsultation(consultationData);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <View style={styles.center}><ActivityIndicator /></View>;

  const firstName = patient?.nome?.split(" ")[0] ?? "Paciente";
  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.eyebrow}>NUTRI THALES</Text>
        <Text style={styles.title}>Olá, {firstName}</Text>
        <Text style={styles.subtitle}>Seu acompanhamento, de forma simples.</Text>

        <View style={styles.hero}>
          <Text style={styles.cardLabel}>MEU ACOMPANHAMENTO</Text>
          <Text style={styles.cardTitle}>{patient?.plano || "Acompanhamento ativo"}</Text>
          {!!patient?.objetivo && <Text style={styles.cardText}>{patient.objetivo}</Text>}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>PRÓXIMA CONSULTA</Text>
          <Text style={styles.cardTitle}>{consultation ? new Date(consultation.data).toLocaleDateString("pt-BR", { day: "2-digit", month: "long" }) : "Nenhuma consulta futura"}</Text>
          {!!consultation?.tipo && <Text style={styles.cardText}>{consultation.tipo}</Text>}
        </View>

        <Text style={styles.sectionTitle}>Acesso rápido</Text>
        <View style={styles.grid}>
          {[
            ["Plano alimentar", "Veja seu plano atual"],
            ["Treino", "Acesse sua programação"],
            ["Check-in", "Acompanhe suas respostas"],
            ["Evolução", "Em breve no aplicativo"],
          ].map(([title, text]) => (
            <View key={title} style={styles.quickCard}>
              <Text style={styles.quickTitle}>{title}</Text>
              <Text style={styles.quickText}>{text}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F6F4EF" },
  content: { padding: 22, paddingBottom: 40 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#F6F4EF" },
  eyebrow: { fontSize: 11, letterSpacing: 2, fontWeight: "800", color: "#6B756E", marginTop: 6 },
  title: { fontSize: 32, fontWeight: "800", color: "#17231B", marginTop: 8 },
  subtitle: { fontSize: 16, color: "#6B756E", marginTop: 6, marginBottom: 24 },
  hero: { backgroundColor: "#1F4C36", borderRadius: 24, padding: 22, marginBottom: 14 },
  card: { backgroundColor: "#FFFFFF", borderRadius: 22, padding: 20, marginBottom: 24 },
  cardLabel: { fontSize: 11, letterSpacing: 1.3, fontWeight: "800", color: "#9BAA9F" },
  cardTitle: { fontSize: 22, fontWeight: "800", color: "#FFFFFF", marginTop: 10 },
  cardText: { fontSize: 14, color: "#DCE8E0", marginTop: 6 },
  sectionTitle: { fontSize: 18, fontWeight: "800", color: "#17231B", marginBottom: 12 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  quickCard: { width: "48%", minHeight: 110, backgroundColor: "#FFFFFF", borderRadius: 20, padding: 16 },
  quickTitle: { fontSize: 16, fontWeight: "800", color: "#17231B" },
  quickText: { fontSize: 13, lineHeight: 18, color: "#6B756E", marginTop: 6 },
});
