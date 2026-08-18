"use client";

import { useState } from "react";
import { Copy, ExternalLink, KeyRound, MessageCircle, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { useToast } from "@/contexts/ToastContext";
import { resetPacientePasswordAction } from "@/services/pacientes.actions";

const PATIENT_AREA_URL = "https://nutrithales.com.br/paciente";

type Props = {
  pacienteId: string;
  email: string | null;
  telefone: string | null;
  authId: string | null;
  status: string | null;
};

function normalizeWhatsAppPhone(value: string | null) {
  if (!value) return null;
  const digits = value.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("55") && digits.length >= 12) return digits;
  if (digits.length === 10 || digits.length === 11) return `55${digits}`;
  return digits;
}

export function AccessAreaPacienteCard({ pacienteId, email, telefone, authId, status }: Props) {
  const { toast } = useToast();
  const [resetting, setResetting] = useState(false);
  const [temporaryPassword, setTemporaryPassword] = useState<string | null>(null);
  const hasAccess = Boolean(authId && email);
  const isInactive = status === "inativo";
  const whatsappPhone = normalizeWhatsAppPhone(telefone);

  async function copyText(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value);
      toast({ kind: "success", title: `${label} copiado` });
    } catch {
      toast({ kind: "error", title: `Não foi possível copiar ${label.toLowerCase()}` });
    }
  }

  async function handleResetPassword() {
    const confirmed = window.confirm(
      "Gerar uma nova senha para este paciente? A senha atual deixará de funcionar imediatamente e a nova será enviada por e-mail.",
    );
    if (!confirmed) return;

    setResetting(true);
    setTemporaryPassword(null);
    const result = await resetPacientePasswordAction(pacienteId);
    setResetting(false);

    if (!result.success) {
      toast({ kind: "error", title: "Não foi possível redefinir a senha", description: result.message });
      return;
    }

    setTemporaryPassword(result.password ?? null);
    toast({ kind: "success", title: "Nova senha gerada", description: result.message });
  }

  function getWhatsAppUrl(password: string) {
    if (!whatsappPhone || !email) return null;
    const message = [
      "Olá! Seguem seus dados de acesso à Área do Paciente:",
      "",
      `Login: ${email}`,
      `Senha: ${password}`,
      `Acesso: ${PATIENT_AREA_URL}`,
      "",
      "Se tiver qualquer dificuldade para entrar, me avise por aqui.",
    ].join("\n");
    return `https://wa.me/${whatsappPhone}?text=${encodeURIComponent(message)}`;
  }

  const whatsappUrl = temporaryPassword ? getWhatsAppUrl(temporaryPassword) : null;

  return (
    <Card className="mb-6">
      <CardContent className="pt-6">
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="mb-1 flex items-center gap-2">
                <ShieldCheck className="size-4 text-brand-dark" />
                <h2 className="text-base font-bold text-ink">Acesso à Área do Paciente</h2>
              </div>
              <p className="text-sm text-muted">Credenciais e atalhos de acesso. A senha atual nunca é armazenada ou exibida.</p>
            </div>
            <Badge tone={!hasAccess || isInactive ? "warning" : "success"}>
              {!hasAccess ? "Acesso não configurado" : isInactive ? "Acesso inativo" : "Acesso ativo"}
            </Badge>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-lg border border-border bg-bg-alt p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">E-mail de acesso</p>
              <div className="mt-2 flex items-center justify-between gap-3">
                <p className="min-w-0 truncate text-sm font-semibold text-ink">{email || "Não informado"}</p>
                {email ? (
                  <button
                    type="button"
                    onClick={() => copyText(email, "E-mail")}
                    className="rounded-md p-2 text-muted transition hover:bg-surface hover:text-ink"
                    aria-label="Copiar e-mail de acesso"
                  >
                    <Copy className="size-4" />
                  </button>
                ) : null}
              </div>
            </div>

            <div className="rounded-lg border border-border bg-bg-alt p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">Link da Área do Paciente</p>
              <div className="mt-2 flex items-center justify-between gap-3">
                <p className="min-w-0 truncate text-sm font-semibold text-ink">nutrithales.com.br/paciente</p>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => copyText(PATIENT_AREA_URL, "Link")}
                    className="rounded-md p-2 text-muted transition hover:bg-surface hover:text-ink"
                    aria-label="Copiar link da Área do Paciente"
                  >
                    <Copy className="size-4" />
                  </button>
                  <a
                    href={PATIENT_AREA_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-md p-2 text-muted transition hover:bg-surface hover:text-ink"
                    aria-label="Abrir Área do Paciente"
                  >
                    <ExternalLink className="size-4" />
                  </a>
                </div>
              </div>
            </div>
          </div>

          {temporaryPassword ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm font-semibold text-ink">Nova senha temporária</p>
              <p className="mt-1 text-xs text-muted">Ela aparece somente após a redefinição. Copie agora se precisar enviar manualmente ao paciente.</p>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                <code className="flex-1 rounded-md border border-amber-200 bg-white px-3 py-2 text-sm font-bold text-ink">{temporaryPassword}</code>
                <Button type="button" size="sm" variant="outline" onClick={() => copyText(temporaryPassword, "Senha")}>
                  <Copy className="size-4" /> Copiar senha
                </Button>
                {whatsappUrl ? (
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-[#25D366] px-4 py-2 text-sm font-semibold text-white transition hover:brightness-95"
                  >
                    <MessageCircle className="size-4" /> Enviar acesso no WhatsApp
                  </a>
                ) : (
                  <span className="text-xs text-muted">Cadastre um telefone válido para habilitar o envio por WhatsApp.</span>
                )}
              </div>
            </div>
          ) : null}

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted">Ao redefinir, a senha anterior deixa de funcionar e uma nova senha é enviada ao e-mail cadastrado.</p>
            <Button type="button" size="sm" variant="outline" loading={resetting} disabled={!hasAccess} onClick={handleResetPassword}>
              <KeyRound className="size-4" /> Redefinir senha
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
