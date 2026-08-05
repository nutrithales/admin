import "server-only";
import { sendEmail } from "@/lib/email/resend";

interface SendPatientCredentialsParams {
  to: string;
  nome: string;
  password: string;
}

export async function sendPatientCredentialsEmail({
  to,
  nome,
  password,
}: SendPatientCredentialsParams) {
  const loginUrl = process.env.NEXT_PUBLIC_PATIENT_LOGIN_URL;

  return sendEmail({
    to,
    subject: "Seu acesso ao portal Nutri Thales Rosa",
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; color: #1a1a1a;">
        <p>Olá, ${nome || "tudo bem"}!</p>
        <p>Seu acesso ao portal foi criado. Use os dados abaixo para entrar:</p>
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
