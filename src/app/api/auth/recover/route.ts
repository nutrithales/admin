import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const ADMIN_EMAIL = "nutri.thalesrosa@gmail.com";

export async function POST(request: NextRequest) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { message: "Informe um e-mail válido." },
      { status: 400 },
    );
  }

  const email =
    typeof body === "object" && body !== null && "email" in body
      ? String(body.email).trim().toLowerCase()
      : "";

  if (!email) {
    return NextResponse.json(
      { message: "Informe o e-mail administrativo." },
      { status: 400 },
    );
  }

  // O painel possui uma única conta administrativa. A resposta genérica para
  // outros endereços impede a exposição de quais contas estão cadastradas.
  if (email !== ADMIN_EMAIL) {
    return NextResponse.json({ ok: true });
  }

  const supabase = await createClient();
  const redirectTo = new URL(
    "/auth/callback?next=/auth/reset-password",
    request.nextUrl.origin,
  ).toString();

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo,
  });

  if (error) {
    console.error("[admin-password-recovery] Supabase rejected the request", {
      code: error.code,
      status: error.status,
      message: error.message,
    });

    if (error.status === 429 || error.code === "over_email_send_rate_limit") {
      return NextResponse.json(
        { message: "Aguarde um minuto antes de solicitar outro link." },
        { status: 429 },
      );
    }

    return NextResponse.json(
      {
        message:
          "O serviço de e-mail não conseguiu enviar o link. Tente novamente em alguns minutos.",
      },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true });
}
