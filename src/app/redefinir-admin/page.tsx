"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, KeyRound, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

function ResetForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (password !== confirmation) {
      setError("As duas senhas precisam ser iguais.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/auth/admin-reset", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const result = (await response.json()) as { ok: boolean; message?: string };

      if (!response.ok || !result.ok) {
        setError(result.message || "Não foi possível definir a nova senha.");
        return;
      }

      setDone(true);
    } catch {
      setError("Não foi possível conectar ao servidor. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-lg border border-border bg-surface p-7 text-center shadow-card">
        <CheckCircle2 className="mx-auto size-12 text-brand" />
        <h1 className="mt-4 text-xl font-bold text-ink">Senha alterada</h1>
        <p className="mt-2 text-sm text-muted">A nova senha já está ativa no painel administrativo.</p>
        <Button className="mt-6 w-full" onClick={() => window.location.assign("/login")}>
          Entrar no painel
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="rounded-lg border border-border bg-surface p-7 shadow-card">
      <div className="text-center">
        <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-brand text-ink-deep shadow-brand">
          <KeyRound className="size-6" />
        </span>
        <h1 className="mt-4 text-xl font-bold text-ink">Criar nova senha</h1>
        <p className="mt-1 text-sm text-muted">Administrador · Nutri Thales Rosa</p>
      </div>

      {error && (
        <div className="mt-5 flex items-start gap-2 rounded-md bg-red-50 px-3.5 py-2.5 text-sm font-medium text-danger">
          <ShieldAlert className="mt-0.5 size-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="mt-6">
        <label htmlFor="password" className="mb-1.5 block text-sm font-semibold text-ink">
          Nova senha
        </label>
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          minLength={10}
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Mínimo de 10 caracteres"
        />
      </div>

      <div className="mt-4">
        <label htmlFor="confirmation" className="mb-1.5 block text-sm font-semibold text-ink">
          Confirmar nova senha
        </label>
        <Input
          id="confirmation"
          type="password"
          autoComplete="new-password"
          minLength={10}
          required
          value={confirmation}
          onChange={(event) => setConfirmation(event.target.value)}
          placeholder="Digite a mesma senha novamente"
        />
      </div>

      <Button type="submit" size="lg" className="mt-6 w-full" loading={loading} disabled={!token}>
        Salvar nova senha
      </Button>

      <p className="mt-4 text-center text-xs text-muted">
        Este link funciona uma única vez e expira automaticamente.
      </p>
    </form>
  );
}

export default function AdminPasswordResetPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-bg px-4 py-10">
      <div className="w-full max-w-sm">
        <Suspense fallback={<div className="text-center text-sm text-muted">Carregando…</div>}>
          <ResetForm />
        </Suspense>
      </div>
    </main>
  );
}
