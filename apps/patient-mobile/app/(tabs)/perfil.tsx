import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "@/lib/supabase";

type Patient = { nome: string; email: string | null; telefone: string | null; plano: string | null };

export default function ProfileScreen() {
  const [patient, setPatient] = useState<Patient | null>(null);

  useEffect(() => {
    async function load() {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;
      const { data } = await supabase.from("pacientes").select("nome, email, telefone, plano").eq("auth_id", userData.user.id).maybeSingle();
      setPatient(data);
    }
    load();
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  return <SafeAreaView style={styles.safe} edges={["top"]}><View style={styles.content}><Text style={styles.title}>Perfil</Text><View style={styles.card}><Text style={styles.name}>{patient?.nome || "Paciente"}</Text>{patient?.email ? <Text style={styles.text}>{patient.email}</Text> : null}{patient?.telefone ? <Text style={styles.text}>{patient.telefone}</Text> : null}{patient?.plano ? <Text style={styles.plan}>{patient.plano}</Text> : null}</View><Pressable onPress={signOut} style={styles.button}><Text style={styles.buttonText}>Sair do aplicativo</Text></Pressable></View></SafeAreaView>;
}

const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: "#F6F4EF" }, content: { flex: 1, padding: 22 }, title: { fontSize: 30, fontWeight: "800", color: "#17231B", marginBottom: 20 }, card: { backgroundColor: "#FFFFFF", borderRadius: 22, padding: 20 }, name: { fontSize: 21, fontWeight: "800", color: "#17231B" }, text: { fontSize: 15, color: "#6B756E", marginTop: 7 }, plan: { alignSelf: "flex-start", marginTop: 14, paddingHorizontal: 11, paddingVertical: 6, borderRadius: 99, overflow: "hidden", backgroundColor: "#E8F0EA", color: "#1F4C36", fontWeight: "700" }, button: { marginTop: "auto", minHeight: 52, borderWidth: 1, borderColor: "#D5D9D5", borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: "#FFFFFF" }, buttonText: { color: "#7A3131", fontWeight: "800" } });
