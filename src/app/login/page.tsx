"use client";

// A recuperação de senha é processada pela rota segura do servidor.
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Lock, Mail, ShieldAlert } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

function LoginForm() {
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/";
  const urlError = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [recovering, setRecovering] = useState(false);
  const [message, setMessage] = useState<string | null>(
    searchParams.get("password") === "updated"
      ? "Senha alterada com sucesso. Entre com a nova senha."
      : null,
  );
  const [error, setError] = useState<string | null>(
    urlError === "not-admin"
      ? "Esta conta não tem acesso ao painel administrativo."
      : urlError === "recovery-link"
        ? "O link de recuperação é inválido ou expirou. Solicite um novo link."
      : null,
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    if (signInError) {
      setError("E-mail ou senha inválidos.");
      setLoading(false);
      return;
    }

    // A full navigation guarantees that the auth cookie written by Supabase
    // is available before the protected dashboard routes are requested.
    window.location.assign(redirectTo.startsWith("/") ? redirectTo : "/");
  }

  async function handleRecovery() {
    setError(null);
    setMessage(null);
    if (!email) {
      setError("Digite o seu e-mail para receber o link de recuperação.");
      return;
    }

    setRecovering(true);

    try {
      const response = await fetch("/api/auth/recover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const result = (await response.json()) as { message?: string };

      if (!response.ok) {
        setError(result.message || "Não foi possível enviar o link de recuperação.");
        return;
      }

      setMessage(
        "Enviamos um link para você criar uma nova senha. Use somente o e-mail mais recente e confira também a caixa de spam.",
      );
    } catch {
      setError("Não foi possível conectar ao serviço de recuperação. Tente novamente.");
    } finally {
      setRecovering(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <span className="flex size-14 items-center justify-center rounded-full bg-brand text-lg font-black text-ink-deep shadow-brand">
            NT
          </span>
          <h1 className="mt-4 text-xl font-bold tracking-tight text-ink">Painel Administrativo</h1>
          <p className="mt-1 text-sm text-muted">Nutri Thales Rosa</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-7 shadow-card"
        >
          {error && (
            <div className="flex items-start gap-2 rounded-md bg-red-50 px-3.5 py-2.5 text-sm font-medium text-danger">
              <ShieldAlert className="mt-0.5 size-4 shrink-0" />
              {error}
            </div>
          )}
          {message && (
            <div className="flex items-start gap-2 rounded-md bg-green-50 px-3.5 py-2.5 text-sm font-medium text-green-800">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
              {message}
            </div>
          )}

          <div>
            <label htmlFor="email" className="mb-1.5 block text-sm font-semibold text-ink">
              E-mail
            </label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10"
                placeholder="seu@email.com"
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="mb-1.5 block text-sm font-semibold text-ink">
              Senha
            </label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10"
                placeholder="••••••••"
              />
            </div>
          </div>

          <Button type="submit" size="lg" className="mt-2 w-full" loading={loading}>
            Entrar
          </Button>
          <button
            type="button"
            onClick={handleRecovery}
            disabled={recovering}
            className="text-sm font-semibold text-ink underline-offset-4 hover:underline disabled:opacity-60"
          >
            {recovering ? "Enviando..." : "Esqueci minha senha"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-muted">
          Acesso restrito à equipe administrativa da Nutri Thales Rosa.
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
