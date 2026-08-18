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
    <main className="min-h-screen bg-[#F3F6F4] px-4 py-5 sm:flex sm:items-center sm:justify-center sm:py-10">
      <div className="mx-auto w-full max-w-[430px] overflow-hidden rounded-[30px] border border-black/[0.06] bg-white shadow-[0_24px_70px_rgba(14,26,20,0.10)]">
        <section className="bg-[#0E1A14] px-6 pb-8 pt-6 text-white sm:px-7 sm:pt-7">
          <div className="flex items-center justify-between gap-4">
            <div className="flex size-[62px] items-center justify-center rounded-[18px] bg-white shadow-[0_8px_24px_rgba(0,0,0,0.18)]">
              <img
                src={BRAND_LOGO_DATA_URI}
                alt="Nutri Thales Rosa"
                className="max-h-11 w-auto max-w-[50px] object-contain"
              />
            </div>
            <span className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-white/75">
              Área do paciente
            </span>
          </div>

          <div className="mt-9 max-w-[330px]">
            <span className="inline-flex rounded-full bg-[#19DD7F]/12 px-2.5 py-1 text-[11px] font-black text-[#6FF0AC]">
              Bem-vindo
            </span>
            <h1 className="mt-3 text-[34px] font-black leading-[0.98] tracking-[-0.04em] sm:text-[38px]">
              Seu acompanhamento, do seu jeito.
            </h1>
            <p className="mt-4 text-sm leading-6 text-white/58">
              Plano alimentar, treinos, check-ins e materiais em um único lugar.
            </p>
          </div>
        </section>

        <section className="px-6 pb-6 pt-6 sm:px-7 sm:pb-7">
          <div className="mb-5">
            <h2 className="text-[24px] font-black tracking-[-0.025em] text-[#101713]">Entrar</h2>
            <p className="mt-1.5 text-sm leading-6 text-[#6F7B74]">
              Use os dados cadastrados no seu acompanhamento.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="patient-email" className="mb-2 block text-[13px] font-black text-[#202923]">
                E-mail
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-[#78857D]" />
                <input
                  id="patient-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="voce@email.com"
                  className="h-[54px] w-full rounded-[16px] border border-[#DCE3DE] bg-[#F8FAF8] pl-11 pr-4 text-[15px] text-[#101713] outline-none transition placeholder:text-[#9AA39D] focus:border-[#19DD7F] focus:bg-white focus:ring-4 focus:ring-[#19DD7F]/10"
                />
              </div>
            </div>

            <div>
              <label htmlFor="patient-password" className="mb-2 block text-[13px] font-black text-[#202923]">
                Senha
              </label>
              <div className="relative">
                <LockKeyhole className="absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-[#78857D]" />
                <input
                  id="patient-password"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Sua senha"
                  className="h-[54px] w-full rounded-[16px] border border-[#DCE3DE] bg-[#F8FAF8] pl-11 pr-4 text-[15px] text-[#101713] outline-none transition placeholder:text-[#9AA39D] focus:border-[#19DD7F] focus:bg-white focus:ring-4 focus:ring-[#19DD7F]/10"
                />
              </div>
            </div>

            {message ? (
              <p className="rounded-[14px] bg-red-50 px-4 py-3 text-sm leading-5 text-red-700">{message}</p>
            ) : null}

            <button
              disabled={loading}
              className="mt-1 flex h-[54px] w-full items-center justify-center gap-2 rounded-[16px] bg-[#19DD7F] px-5 text-[15px] font-black text-[#07120C] shadow-[0_12px_26px_rgba(25,221,127,0.20)] transition hover:bg-[#16C973] active:scale-[0.99] disabled:opacity-60"
            >
              <LogIn className="size-[17px]" /> {loading ? "Entrando..." : "Entrar na minha área"}
            </button>
          </form>

          <div className="mt-5 flex items-center justify-center gap-2 rounded-[14px] bg-[#F3F6F4] px-3.5 py-3 text-center text-[11px] leading-5 text-[#718078]">
            <ShieldCheck className="size-4 shrink-0 text-[#159F60]" />
            Acesso protegido e vinculado ao seu acompanhamento.
          </div>
        </section>
      </div>
    </main>
  );
}
