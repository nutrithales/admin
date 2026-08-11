import { NextResponse, type NextRequest } from "next/server";
import { assertAdmin } from "@/lib/supabase/assert-admin";

export const dynamic = "force-dynamic";

function agendaConfig() {
  const baseUrl = (process.env.AGENDA_API_URL ?? "https://www.nutrithales.com.br").replace(/\/$/, "");
  const password = process.env.AGENDA_ADMIN_PASSWORD;

  if (!password) {
    throw new Error("A integração da agenda ainda não foi configurada no painel.");
  }

  return { baseUrl, password };
}

function errorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "Não foi possível acessar a agenda.";
  const status = message === "Não autenticado." || message.includes("administradores") ? 401 : 500;
  return NextResponse.json({ success: false, message }, { status });
}

export async function GET() {
  try {
    await assertAdmin();
    const { baseUrl, password } = agendaConfig();
    const response = await fetch(`${baseUrl}/api/admin`, {
      headers: { Authorization: `Bearer ${password}` },
      cache: "no-store",
    });
    const body = await response.json().catch(() => ({}));

    if (!response.ok) {
      return NextResponse.json(
        { success: false, message: body.message ?? body.error ?? "A agenda recusou o acesso." },
        { status: response.status },
      );
    }

    return NextResponse.json(body, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await assertAdmin();
    const id = request.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ success: false, message: "Agendamento não informado." }, { status: 400 });
    }

    const { baseUrl, password } = agendaConfig();
    const response = await fetch(`${baseUrl}/api/admin?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${password}` },
      cache: "no-store",
    });
    const body = await response.json().catch(() => ({}));

    if (!response.ok) {
      return NextResponse.json(
        { success: false, message: body.message ?? body.error ?? "Não foi possível cancelar o agendamento." },
        { status: response.status },
      );
    }

    return NextResponse.json({ success: true, ...body });
  } catch (error) {
    return errorResponse(error);
  }
}
