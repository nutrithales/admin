import "server-only";
import { sendEmail } from "@/lib/email/resend";

interface SendPatientCredentialsParams {
  to: string;
  nome: string;
  password: string;
  /** Set when the account was created via public self-registration and is
   * awaiting admin approval — the credentials work, but access is gated
   * until "pendente" flips to "ativo" in the admin panel. */
  pendingApproval?: boolean;
}

export async function sendPatientCredentialsEmail({
  to,
  nome,
  password,
  pendingApproval,
}: SendPatientCredentialsParams) {
  const loginUrl = process.env.NEXT_PUBLIC_PATIENT_LOGIN_URL;

  return sendEmail({
    to,
    subject: pendingApproval
      ? "Recebemos seu cadastro — Nutri Thales Rosa"
      : "Seu acesso ao portal Nutri Thales Rosa",
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; color: #1a1a1a;">
        <p>Olá, ${nome || "tudo bem"}!</p>
        ${
          pendingApproval
            ? `<p>Recebemos seu cadastro! Assim que revisarmos seus dados, seu acesso será liberado. Guarde a senha abaixo — já é a que você vai usar para entrar:</p>`
            : `<p>Seu acesso ao portal foi criado. Use os dados abaixo para entrar:</p>`
        }
        <p>
          <strong>E-mail:</strong> ${to}<br />
          <strong>Senha:</strong> ${password}
        </p>
        ${loginUrl ? `<p><a href="${loginUrl}">Acessar o portal</a></p>` : ""}
        <p>Recomendamos trocar a senha após o primeiro acesso.</p>
      </div>
    `,
  });
}
