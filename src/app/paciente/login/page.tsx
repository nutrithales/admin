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
      <div className="mx-auto min-h-screen w-full max-w-[430px] bg-[#F4F6F3] px-5 pb-[calc(28px+env(safe-area-inset-bottom))] pt-[calc(20px+env(safe-area-inset-top))] sm:min-h-0 sm:rounded-[34px] sm:border sm:border-black/[0.05] sm:bg-white sm:px-7 sm:py-7 sm:shadow-[0_28px_80px_rgba(14,26,20,0.10)]">
        <header className="flex items-center justify-between">
          <img src={BRAND_LOGO} alt="Nutri Thales Rosa" className="h-auto w-[116px] object-contain" />
          <span className="rounded-full border border-[#DDE4DF] bg-white px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-[#637068] shadow-[0_5px_16px_rgba(14,26,20,0.04)]">
            Área do paciente
          </span>
        </header>

        <section className="mt-12">
          <div className="mb-3 flex items-center gap-2">
            <span className="size-2 rounded-full bg-[#19DD7F]" />
            <span className="text-[11px] font-black uppercase tracking-[0.12em] text-[#159F60]">Acesso exclusivo</span>
          </div>
          <h1 className="max-w-[350px] text-[36px] font-black leading-[0.98] tracking-[-0.045em] text-[#101713]">
            Seu acompanhamento, em um só lugar.
          </h1>
          <p className="mt-4 max-w-[340px] text-[14px] leading-6 text-[#6F7B74]">
            Entre para acessar plano alimentar, treinos, check-ins e materiais liberados para você.
          </p>
        </section>

        <section className="mt-8 rounded-[26px] border border-black/[0.055] bg-white p-5 shadow-[0_18px_46px_rgba(14,26,20,0.07)] sm:border-[#E4E9E5] sm:shadow-none">
          <div className="mb-5">
            <h2 className="text-[21px] font-black tracking-[-0.025em]">Entrar</h2>
            <p className="mt-1 text-[12px] leading-5 text-[#7B8680]">Use o e-mail e a senha cadastrados no seu acompanhamento.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="patient-email" className="mb-2 block text-[12px] font-black text-[#2B342F]">E-mail</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-[#87928C]" />
                <input
                  id="patient-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="voce@email.com"
                  className="h-[56px] w-full rounded-[17px] border border-[#DDE4DF] bg-[#F8FAF8] pl-11 pr-4 text-[15px] outline-none transition placeholder:text-[#A0A9A3] focus:border-[#19DD7F] focus:bg-white focus:ring-4 focus:ring-[#19DD7F]/10"
                />
              </div>
            </div>

            <div>
              <label htmlFor="patient-password" className="mb-2 block text-[12px] font-black text-[#2B342F]">Senha</label>
              <div className="relative">
                <LockKeyhole className="absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-[#87928C]" />
                <input
                  id="patient-password"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Sua senha"
                  className="h-[56px] w-full rounded-[17px] border border-[#DDE4DF] bg-[#F8FAF8] pl-11 pr-4 text-[15px] outline-none transition placeholder:text-[#A0A9A3] focus:border-[#19DD7F] focus:bg-white focus:ring-4 focus:ring-[#19DD7F]/10"
                />
              </div>
            </div>

            {message ? <p className="rounded-[14px] bg-red-50 px-4 py-3 text-[13px] leading-5 text-red-700">{message}</p> : null}

            <button
              disabled={loading}
              className="flex h-[56px] w-full items-center justify-center gap-2 rounded-[17px] bg-[#0E1A14] px-5 text-[14px] font-black text-white transition active:scale-[0.99] disabled:opacity-60"
            >
              <LogIn className="size-[17px]" /> {loading ? "Entrando..." : "Entrar na minha área"}
            </button>
          </form>
        </section>

        <div className="mt-5 flex items-start gap-2 px-1 text-[11px] leading-5 text-[#7B8780]">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-[#159F60]" />
          <span>Seus dados ficam protegidos e vinculados exclusivamente ao seu acompanhamento.</span>
        </div>
      </div>
    </main>
  );
}
