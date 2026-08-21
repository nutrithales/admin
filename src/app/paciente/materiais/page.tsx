import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MateriaisClient } from "./MateriaisClient";

export const metadata = {
  title: "Materiais Extras | Nutri Thales Rosa",
  description: "Biblioteca de materiais do seu acompanhamento.",
};

export default async function MateriaisPacientePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/paciente/login");

  const [{ data: paciente }, { data: conteudos }] = await Promise.all([
    supabase.from("pacientes").select("status").eq("auth_id", user.id).maybeSingle(),
    supabase
      .from("biblioteca")
      .select("*")
      .eq("ativo", true)
      .order("ordem", { ascending: true })
      .order("created_at", { ascending: false }),
  ]);

  if (!paciente) redirect("/paciente/login?error=not-patient");
  if (String(paciente.status || "").toLowerCase() !== "ativo") redirect("/paciente");

  return <MateriaisClient conteudos={conteudos || []} />;
}
