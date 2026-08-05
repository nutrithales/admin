"use client";

import { useState } from "react";
import { Check, Copy, KeyRound } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

export interface PasswordRevealModalProps {
  open: boolean;
  onClose: () => void;
  password: string | null;
  pacienteNome?: string;
}

export function PasswordRevealModal({
  open,
  onClose,
  password,
  pacienteNome,
}: PasswordRevealModalProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    if (!password) return;
    await navigator.clipboard.writeText(password);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Modal
      open={open && !!password}
      onClose={onClose}
      title="Senha de acesso gerada"
      description={
        pacienteNome
          ? `Envie esta senha para ${pacienteNome}. Ela só é exibida agora — anote antes de fechar.`
          : "Envie esta senha ao paciente. Ela só é exibida agora — anote antes de fechar."
      }
      size="sm"
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3 rounded-lg border border-border bg-bg-alt-2 px-4 py-3.5">
          <KeyRound className="size-5 shrink-0 text-brand-dark" />
          <code className="flex-1 text-lg font-bold tracking-wide text-ink">{password}</code>
          <Button type="button" size="sm" variant="outline" onClick={handleCopy}>
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            {copied ? "Copiado" : "Copiar"}
          </Button>
        </div>
        <p className="text-xs text-muted">
          O paciente pode trocar a senha depois de fazer login, se desejar.
        </p>
        <div className="flex justify-end">
          <Button type="button" onClick={onClose}>
            Entendi
          </Button>
        </div>
      </div>
    </Modal>
  );
}
