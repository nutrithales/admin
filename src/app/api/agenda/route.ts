import { NextResponse, type NextRequest } from "next/server";
import { assertAdmin } from "@/lib/supabase/assert-admin";
import { createAdminClient } from "@/lib/supabase/admin";

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

    const eventIds = (body.events ?? []).map((event: { id: string }) => event.id);
    const admin = createAdminClient();
    const { data: consultations } = eventIds.length
      ? await admin
          .from("consultas")
          .select("id, google_event_id, status, auth_id")
          .in("google_event_id", eventIds)
      : { data: [] };
    const authIds = [...new Set((consultations ?? []).map((item) => item.auth_id))];
    const { data: patients } = authIds.length
      ? await admin.from("pacientes").select("id, auth_id, nome").in("auth_id", authIds)
      : { data: [] };
    const consultationByEvent = new Map((consultations ?? []).map((item) => [item.google_event_id, item]));
    const patientByAuth = new Map((patients ?? []).map((item) => [item.auth_id, item]));

    return NextResponse.json(
      {
        ...body,
        events: (body.events ?? []).map((event: { id: string }) => {
          const consultation = consultationByEvent.get(event.id);
          const patient = consultation ? patientByAuth.get(consultation.auth_id) : undefined;
          return {
            ...event,
            consultationId: consultation?.id ?? null,
            status: consultation?.status ?? "agendada",
            patientId: patient?.id ?? null,
          };
        }),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
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

    const admin = createAdminClient();
    await admin.from("consultas").update({ status: "cancelada" }).eq("google_event_id", id);

    return NextResponse.json({ success: true, ...body });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await assertAdmin();
    const id = request.nextUrl.searchParams.get("id");
    const body = await request.json().catch(() => ({}));
    const allowed = ["agendada", "realizada", "falta", "cancelada"];
    if (!id || !allowed.includes(body.status)) {
      return NextResponse.json({ success: false, message: "Atualização inválida." }, { status: 400 });
    }

    const admin = createAdminClient();
    const { error } = await admin
      .from("consultas")
      .update({ status: body.status })
      .eq("google_event_id", id);
    if (error) throw error;
    if (body.status === "realizada") {
      const { data: consultation } = await admin
        .from("consultas")
        .select("auth_id")
        .eq("google_event_id", id)
        .maybeSingle();
      if (consultation?.auth_id) {
        await admin.from("pacientes").update({
          fluxo_etapa: "06_consulta_realizada",
          fluxo_updated_at: new Date().toISOString(),
        }).eq("auth_id", consultation.auth_id);
      }
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    return errorResponse(error);
  }
}
