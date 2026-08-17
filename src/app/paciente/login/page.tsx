"use client";

import { useState } from "react";
import { Mail, Send, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { BRAND_LOGO_DATA_URI } from "@/lib/brand-logo";

export default function PatientLoginPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/paciente` },
    });
    setMessage(error ? "Não foi possível enviar o acesso. Confira o e-mail informado." : "Enviamos um link seguro para o seu e-mail. Abra-o para acessar sua área do paciente.");
    setLoading(false);
  }

  return (
    <main className="min-h-screen bg-bg px-4 py-10 sm:py-16">
      <div className="mx-auto max-w-md">
        <div className="mb-7 text-center">
          <img src={BRAND_LOGO_DATA_URI} alt="Nutri Thales Rosa" className="mx-auto h-auto w-36 object-contain" />
          <p className="mt-5 text-sm font-bold uppercase tracking-[0.18em] text-brand-dark">Nutri Thales Rosa</p>
          <h1 className="mt-2 text-3xl font-black text-ink">Área do paciente</h1>
          <p className="mt-2 text-sm leading-6 text-muted">Use o mesmo e-mail informado no agendamento. Você receberá um link de acesso sem precisar lembrar uma senha.</p>
        </div>
        <form onSubmit={handleSubmit} className="rounded-2xl border border-border bg-surface p-6 shadow-card">
          <label htmlFor="patient-email" className="mb-2 block text-sm font-bold text-ink">Seu e-mail</label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-muted" />
            <input id="patient-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@email.com" className="h-12 w-full rounded-xl border border-border bg-white pl-11 pr-4 text-ink outline-none transition focus:border-brand focus:ring-4 focus:ring-brand-light" />
          </div>
          <button disabled={loading} className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand px-5 font-bold text-ink-deep shadow-brand transition hover:bg-brand-dark disabled:opacity-60">
            <Send className="size-4" /> {loading ? "Enviando..." : "Receber link de acesso"}
          </button>
          {message && <p className="mt-4 rounded-xl bg-bg-alt p-3 text-sm leading-5 text-ink">{message}</p>}
        </form>
        <p className="mt-5 flex items-center justify-center gap-2 text-center text-xs text-muted"><ShieldCheck className="size-4 text-brand-dark" /> Seus dados ficam protegidos e vinculados ao seu atendimento.</p>
      </div>
    </main>
  );
}
