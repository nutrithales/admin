import "server-only";

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
}

interface SendEmailResult {
  ok: boolean;
  error?: string;
}

/** Sends a transactional email via the Resend HTTP API. Requires
 * RESEND_API_KEY and EMAIL_FROM — returns a soft failure instead of
 * throwing so callers can fall back to showing the content on-screen. */
export async function sendEmail({ to, subject, html }: SendEmailParams): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (!apiKey || !from) {
    return { ok: false, error: "RESEND_API_KEY / EMAIL_FROM não configurados." };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to, subject, html }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    return { ok: false, error: `Resend respondeu ${response.status}${body ? `: ${body}` : ""}` };
  }

  return { ok: true };
}
