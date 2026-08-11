"use client";

import { useEffect, useState } from "react";
import { KeyRound, Lock, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [checking, setChecking] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        setError("Este link é inválido ou expirou. Solicite um novo link de recuperação.");
      }
      setChecking(false);
    });
  }, []);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("A nova senha precisa ter pelo menos 8 caracteres.");
      return;
    }
    if (password !== confirmation) {
      setError("As duas senhas não são iguais.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError("Não foi possível alterar a senha. Solicite um novo link e tente novamente.");
      setLoading(false);
      return;
    }

    await supabase.auth.signOut();
    window.location.assign("/login?password=updated");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <span className="flex size-14 items-center justify-center rounded-full bg-brand text-ink-deep shadow-brand">
            <KeyRound className="size-6" />
          </span>
          <h1 className="mt-4 text-xl font-bold tracking-tight text-ink">Criar nova senha</h1>
          <p className="mt-1 text-sm text-muted">Painel Administrativo · Nutri Thales Rosa</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-7 shadow-card">
          {error && (
            <div className="flex items-start gap-2 rounded-md bg-red-50 px-3.5 py-2.5 text-sm font-medium text-danger">
              <ShieldAlert className="mt-0.5 size-4 shrink-0" />
              {error}
            </div>
          )}

          <div>
            <label htmlFor="new-password" className="mb-1.5 block text-sm font-semibold text-ink">Nova senha</label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
              <Input id="new-password" type="password" autoComplete="new-password" required minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} className="pl-10" placeholder="Mínimo de 8 caracteres" disabled={checking || Boolean(error && !password)} />
            </div>
          </div>

          <div>
            <label htmlFor="confirm-password" className="mb-1.5 block text-sm font-semibold text-ink">Confirmar nova senha</label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
              <Input id="confirm-password" type="password" autoComplete="new-password" required minLength={8} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className="pl-10" placeholder="Digite novamente" disabled={checking} />
            </div>
          </div>

          <Button type="submit" size="lg" className="mt-2 w-full" loading={loading || checking} disabled={checking}>
            Salvar nova senha
          </Button>
        </form>
      </div>
    </div>
  );
}
