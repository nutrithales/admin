"use client";

import { useState } from "react";
import { LockKeyhole, LogIn, Mail, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { BRAND_LOGO_DATA_URI } from "@/lib/brand-logo";

export default function PatientLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      setMessage("E-mail ou senha incorretos. Confira os dados e tente novamente.");
      setLoading(false);
      return;
    }

    window.location.href = "/paciente";
  }

  return (
    <main className="min-h-screen bg-bg px-4 py-8 sm:py-12">
      <div className="mx-auto max-w-md">
        <div className="mb-8 text-center">
          <img
            src={BRAND_LOGO_DATA_URI}
            alt="Nutri Thales Rosa"
            className="mx-auto h-auto w-32 object-contain sm:w-36"
          />
          <p className="mt-6 text-xs font-black uppercase tracking-[0.16em] text-brand-dark">
            Área do paciente
          </p>
          <h1 className="mt-2 text-4xl font-black tracking-tight text-ink">Entrar</h1>
          <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-muted">
            Acesse com o e-mail e a senha cadastrados no seu acompanhamento.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-[24px] border border-border bg-surface p-6 shadow-card sm:p-7"
        >
          <label htmlFor="patient-email" className="mb-2 block text-sm font-bold text-ink">
            E-mail
          </label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-muted" />
            <input
              id="patient-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@email.com"
              className="h-12 w-full rounded-xl border border-border bg-white pl-11 pr-4 text-ink outline-none transition focus:border-brand focus:ring-4 focus:ring-brand-light"
            />
          </div>

          <label htmlFor="patient-password" className="mb-2 mt-5 block text-sm font-bold text-ink">
            Senha
          </label>
          <div className="relative">
            <LockKeyhole className="absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-muted" />
            <input
              id="patient-password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Sua senha"
              className="h-12 w-full rounded-xl border border-border bg-white pl-11 pr-4 text-ink outline-none transition focus:border-brand focus:ring-4 focus:ring-brand-light"
            />
          </div>

          {message ? (
            <p className="mt-4 rounded-xl bg-bg-alt p-3 text-sm leading-5 text-ink">{message}</p>
          ) : null}

          <button
            disabled={loading}
            className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-brand px-5 font-black text-ink-deep shadow-brand transition hover:bg-brand-dark disabled:opacity-60"
          >
            <LogIn className="size-4" /> {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <p className="mt-5 flex items-center justify-center gap-2 text-center text-xs leading-5 text-muted">
          <ShieldCheck className="size-4 shrink-0 text-brand-dark" />
          Seus dados ficam protegidos e vinculados ao seu acompanhamento.
        </p>
      </div>
    </main>
  );
}
