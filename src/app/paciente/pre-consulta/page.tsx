import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PreConsultationForm } from "./PreConsultationForm";

export const metadata = { title: "Formulário de pré-consulta" };

export default async function PreConsultationPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/paciente/login");

  const { data: patient } = await supabase.from("pacientes").select("id, nome, email, cpf, data_nascimento").eq("auth_id", user.id).single();
  if (!patient) redirect("/paciente/login?error=not-patient");
  const [{ data: form }, { data: consultations }] = await Promise.all([
    supabase.from("formularios_pre_consulta").select("*").eq("paciente_id", patient.id).maybeSingle(),
    supabase.from("consultas").select("data, tipo").eq("auth_id", user.id).order("data", { ascending: true }),
  ]);
  const firstConsultation = consultations?.find((item) => !/reconsulta|retorno|acompanhamento/i.test(item.tipo ?? ""));
  const manualAvailable = Boolean(firstConsultation?.data && new Date(firstConsultation.data).getTime() > Date.now());

  return (
    <main className="min-h-screen bg-bg px-4 py-8 sm:py-12">
      <div className="mx-auto max-w-3xl">
        <header className="mb-7 flex items-center gap-4">
          <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-brand text-lg font-black text-ink-deep shadow-brand">TR</span>
          <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-dark">Nutri Thales Rosa</p><p className="mt-1 text-sm text-muted">Pré-consulta individualizada</p></div>
        </header>
        {form ? <PreConsultationForm patient={patient} initialForm={form} manualAvailable={manualAvailable} /> : (
          <section className="rounded-2xl border border-border bg-surface p-7 shadow-card">
            <h1 className="text-2xl font-black text-ink">Nenhum formulário pendente</h1>
            <p className="mt-2 leading-6 text-muted">Quando sua primeira consulta for agendada, o formulário aparecerá aqui automaticamente.</p>
          </section>
        )}
      </div>
    </main>
  );
}
