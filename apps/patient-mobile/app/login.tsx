import { router } from "expo-router";
import { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "@/lib/supabase";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!email.trim() || !password) return;
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error || !data.user) {
      setLoading(false);
      Alert.alert("Não foi possível entrar", "Confira seu e-mail e senha.");
      return;
    }

    const { data: patient } = await supabase.from("pacientes").select("id").eq("auth_id", data.user.id).maybeSingle();
    if (!patient) {
      await supabase.auth.signOut();
      setLoading(false);
      Alert.alert("Acesso não liberado", "Esta conta não está vinculada a um paciente.");
      return;
    }

    setLoading(false);
    router.replace("/(tabs)");
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.container}>
        <View style={styles.brand}>
          <Text style={styles.eyebrow}>NUTRI THALES</Text>
          <Text style={styles.title}>Sua área de acompanhamento</Text>
          <Text style={styles.subtitle}>Plano, treino, check-ins e evolução em um só lugar.</Text>
        </View>
        <View style={styles.card}>
          <TextInput autoCapitalize="none" autoComplete="email" keyboardType="email-address" placeholder="E-mail" value={email} onChangeText={setEmail} style={styles.input} />
          <TextInput autoCapitalize="none" placeholder="Senha" secureTextEntry value={password} onChangeText={setPassword} style={styles.input} />
          <Pressable disabled={loading} onPress={handleLogin} style={({ pressed }) => [styles.button, pressed && styles.buttonPressed, loading && styles.buttonDisabled]}>
            <Text style={styles.buttonText}>{loading ? "Entrando..." : "Entrar"}</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F6F4EF" },
  container: { flex: 1, justifyContent: "center", padding: 24, gap: 28 },
  brand: { gap: 10 },
  eyebrow: { fontSize: 12, letterSpacing: 2.2, fontWeight: "800", color: "#667064" },
  title: { fontSize: 34, lineHeight: 39, fontWeight: "800", color: "#17231B" },
  subtitle: { fontSize: 16, lineHeight: 23, color: "#667064" },
  card: { backgroundColor: "#FFFFFF", borderRadius: 24, padding: 18, gap: 12 },
  input: { minHeight: 54, borderWidth: 1, borderColor: "#DCE1DA", borderRadius: 16, paddingHorizontal: 16, fontSize: 16, backgroundColor: "#FBFCFA" },
  button: { minHeight: 54, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: "#1F4C36" },
  buttonPressed: { opacity: 0.88 },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "800" },
});
