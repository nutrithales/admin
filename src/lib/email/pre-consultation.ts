import "server-only";
import { sendEmail } from "@/lib/email/resend";

interface SendPreConsultationEmailParams {
  to: string;
  nome: string;
  accessUrl: string;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function sendPreConsultationEmail({
  to,
  nome,
  accessUrl,
}: SendPreConsultationEmailParams) {
  const safeName = escapeHtml(nome.trim().split(/\s+/)[0] || "tudo bem");
  const safeAccessUrl = escapeHtml(accessUrl);

  return sendEmail({
    to,
    subject: "Seu questionário pré-consulta | Nutri Thales Rosa",
    html: `
      <div style="background:#f3f7f4;padding:32px 16px;font-family:Arial,sans-serif;color:#173f2d;">
        <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #dbe7df;border-radius:18px;overflow:hidden;">
          <div style="background:#124c35;padding:24px 28px;color:#ffffff;">
            <p style="margin:0;font-size:13px;letter-spacing:.08em;text-transform:uppercase;opacity:.85;">Nutri Thales Rosa</p>
            <h1 style="margin:8px 0 0;font-size:25px;line-height:1.25;">Vamos preparar sua primeira consulta?</h1>
          </div>
          <div style="padding:28px;">
            <p style="margin:0 0 16px;">Olá, ${safeName}!</p>
            <p style="margin:0 0 16px;line-height:1.6;">Seu agendamento foi recebido. Antes da primeira consulta, preciso que você responda ao questionário pré-consulta. Suas respostas vão me ajudar a conhecer melhor sua rotina, seus objetivos e suas necessidades.</p>
            <p style="margin:0 0 24px;line-height:1.6;">Ao acessar sua área, você também encontrará o <strong>Manual para a Primeira Consulta</strong>.</p>
            <p style="margin:0 0 26px;text-align:center;">
              <a href="${safeAccessUrl}" style="display:inline-block;background:#19ce7b;color:#083c29;text-decoration:none;font-weight:700;padding:14px 22px;border-radius:10px;">Preencher questionário</a>
            </p>
            <p style="margin:0 0 12px;font-size:13px;line-height:1.5;color:#5a6d63;">Este é um link seguro e de uso único. Se o botão não abrir, copie e cole este endereço no navegador:</p>
            <p style="margin:0 0 22px;font-size:12px;line-height:1.5;word-break:break-all;color:#39745a;">${safeAccessUrl}</p>
            <p style="margin:0;line-height:1.6;">Até breve,<br><strong>Nutricionista Thales Rosa</strong><br>CRN 8 18115 · CREF 019714</p>
          </div>
        </div>
      </div>
    `,
  });
}
