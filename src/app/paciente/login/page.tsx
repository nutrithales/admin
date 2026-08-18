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
    <main className="min-h-screen bg-[#f6f7fb]">
      <div className="mx-auto min-h-screen w-full max-w-md bg-white shadow-[0_20px_70px_rgba(15,23,42,0.08)] sm:my-8 sm:min-h-0 sm:overflow-hidden sm:rounded-[34px]">
        <section className="relative overflow-hidden bg-gradient-to-br from-[#5157d8] via-[#6259d8] to-[#7754ca] px-6 pb-16 pt-9 text-white">
          <div className="absolute -right-12 -top-10 size-44 rounded-full bg-white/10" />
          <div className="absolute -bottom-20 -left-16 size-52 rounded-full bg-white/10" />

          <div className="relative">
            <div className="flex items-center justify-between gap-4">
              <div className="flex size-14 items-center justify-center rounded-2xl bg-white shadow-lg shadow-black/10">
                <img
                  src={BRAND_LOGO_DATA_URI}
                  alt="Nutri Thales Rosa"
                  className="h-auto w-11 object-contain"
                />
              </div>
              <span className="rounded-full bg-white/15 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.14em] text-white/90 backdrop-blur-sm">
                Área do paciente
              </span>
            </div>

            <div className="mt-10 max-w-xs">
              <p className="text-sm font-bold text-white/70">Bem-vindo</p>
              <h1 className="mt-1 text-[34px] font-black leading-[1.02] tracking-[-0.035em]">
                Seu acompanhamento, em um só lugar.
              </h1>
              <p className="mt-4 text-sm leading-6 text-white/75">
                Acesse seu plano alimentar, treinos, check-ins e materiais liberados para você.
              </p>
            </div>
          </div>
        </section>

        <section className="relative -mt-7 rounded-t-[30px] bg-white px-6 pb-8 pt-7">
          <div className="mb-6">
            <h2 className="text-2xl font-black tracking-tight text-ink">Entrar</h2>
            <p className="mt-1 text-sm leading-6 text-muted">
              Use o e-mail e a senha cadastrados no seu acompanhamento.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="patient-email" className="mb-2 block text-sm font-bold text-ink">
                E-mail
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted" />
                <input
                  id="patient-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="voce@email.com"
                  className="h-14 w-full rounded-2xl border border-border bg-[#fafafa] pl-12 pr-4 text-ink outline-none transition focus:border-[#6259d8] focus:bg-white focus:ring-4 focus:ring-[#6259d8]/10"
                />
              </div>
            </div>

            <div>
              <label htmlFor="patient-password" className="mb-2 block text-sm font-bold text-ink">
                Senha
              </label>
              <div className="relative">
                <LockKeyhole className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted" />
                <input
                  id="patient-password"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Sua senha"
                  className="h-14 w-full rounded-2xl border border-border bg-[#fafafa] pl-12 pr-4 text-ink outline-none transition focus:border-[#6259d8] focus:bg-white focus:ring-4 focus:ring-[#6259d8]/10"
                />
              </div>
            </div>

            {message ? (
              <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm leading-5 text-red-700">{message}</p>
            ) : null}

            <button
              disabled={loading}
              className="mt-2 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#171923] px-5 font-black text-white shadow-[0_12px_30px_rgba(23,25,35,0.16)] transition hover:bg-black disabled:opacity-60"
            >
              <LogIn className="size-4" /> {loading ? "Entrando..." : "Acessar minha área"}
            </button>
          </form>

          <div className="mt-6 flex items-center justify-center gap-2 rounded-2xl bg-[#f6f7fb] px-4 py-3 text-center text-xs leading-5 text-muted">
            <ShieldCheck className="size-4 shrink-0 text-[#6259d8]" />
            Seus dados ficam protegidos e vinculados ao seu acompanhamento.
          </div>
        </section>
      </div>
    </main>
  );
}
