"use client";

import { useState } from "react";
import { LockKeyhole, LogIn, Mail, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const BRAND_LOGO = "https://www.nutrithales.com.br/assets/logo-thales.png";

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
    <main className="min-h-screen bg-[#F4F6F3] text-[#101713] sm:flex sm:items-center sm:justify-center sm:px-5 sm:py-10">
      <div className="mx-auto min-h-screen w-full max-w-[430px] bg-[#F4F6F3] px-5 pb-[calc(22px+env(safe-area-inset-bottom))] pt-[calc(14px+env(safe-area-inset-top))] sm:min-h-0 sm:rounded-[32px] sm:border sm:border-black/[0.05] sm:bg-white sm:px-7 sm:py-7 sm:shadow-[0_28px_80px_rgba(14,26,20,0.10)]">
        <header className="flex items-center justify-between gap-4">
          <img src={BRAND_LOGO} alt="Nutri Thales Rosa" className="h-auto w-[74px] object-contain" />
          <span className="rounded-full border border-[#DDE4DF] bg-white px-2.5 py-1.5 text-[8px] font-black uppercase tracking-[0.11em] text-[#637068] shadow-[0_4px_14px_rgba(14,26,20,0.03)]">
            Área do paciente
          </span>
        </header>

        <section className="mt-6.5 mt-6">
          <h1 className="max-w-[315px] text-[29px] font-black leading-[0.99] tracking-[-0.041em] text-[#101713]">
            Seu acompanhamento em um só lugar.
          </h1>
          <p className="mt-2.5 max-w-[320px] text-[12.5px] leading-[1.6] text-[#6F7B74]">
            Acesse plano alimentar, treinos, check-ins e materiais liberados para você.
          </p>
        </section>

        <section className="mt-5 rounded-[23px] border border-black/[0.055] bg-white p-4.5 p-4 shadow-[0_12px_30px_rgba(14,26,20,0.055)] sm:border-[#E4E9E5] sm:shadow-none">
          <div className="mb-4">
            <h2 className="text-[19px] font-black tracking-[-0.025em]">Entrar</h2>
            <p className="mt-1 text-[11.5px] leading-5 text-[#7B8680]">Use o e-mail e a senha do seu acompanhamento.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label htmlFor="patient-email" className="mb-1.5 block text-[11.5px] font-black text-[#2B342F]">E-mail</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 size-[16px] -translate-y-1/2 text-[#87928C]" />
                <input
                  id="patient-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="voce@email.com"
                  className="h-[52px] w-full rounded-[16px] border border-[#DDE4DF] bg-[#F8FAF8] pl-10.5 pl-10 pr-4 text-[14px] outline-none transition placeholder:text-[#A0A9A3] focus:border-[#19DD7F] focus:bg-white focus:ring-4 focus:ring-[#19DD7F]/10"
                />
              </div>
            </div>

            <div>
              <label htmlFor="patient-password" className="mb-1.5 block text-[11.5px] font-black text-[#2B342F]">Senha</label>
              <div className="relative">
                <LockKeyhole className="absolute left-4 top-1/2 size-[16px] -translate-y-1/2 text-[#87928C]" />
                <input
                  id="patient-password"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Sua senha"
                  className="h-[52px] w-full rounded-[16px] border border-[#DDE4DF] bg-[#F8FAF8] pl-10 pr-4 text-[14px] outline-none transition placeholder:text-[#A0A9A3] focus:border-[#19DD7F] focus:bg-white focus:ring-4 focus:ring-[#19DD7F]/10"
                />
              </div>
            </div>

            {message ? <p className="rounded-[14px] bg-red-50 px-4 py-3 text-[12px] leading-5 text-red-700">{message}</p> : null}

            <button
              disabled={loading}
              className="flex h-[52px] w-full items-center justify-center gap-2 rounded-[16px] bg-[#0E1A14] px-5 text-[13px] font-black text-white transition active:scale-[0.99] disabled:opacity-60"
            >
              <LogIn className="size-[16px]" /> {loading ? "Entrando..." : "Entrar na minha área"}
            </button>
          </form>
        </section>

        <div className="mt-3.5 flex items-start gap-2 px-1 text-[9.5px] leading-4 text-[#7B8780]">
          <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-[#159F60]" />
          <span>Acesso protegido e vinculado ao seu acompanhamento.</span>
        </div>
      </div>
    </main>
  );
}
