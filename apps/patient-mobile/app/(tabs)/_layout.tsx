import { Tabs } from "expo-router";

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" options={{ title: "Início" }} />
      <Tabs.Screen name="plano" options={{ title: "Plano" }} />
      <Tabs.Screen name="treino" options={{ title: "Treino" }} />
      <Tabs.Screen name="checkin" options={{ title: "Check-in" }} />
      <Tabs.Screen name="perfil" options={{ title: "Perfil" }} />
    </Tabs>
  );
}
