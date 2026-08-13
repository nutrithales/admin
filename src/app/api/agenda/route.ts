import { NextResponse, type NextRequest } from "next/server";
import { assertAdmin } from "@/lib/supabase/assert-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { CONSULTA_STATUS } from "@/lib/clara/consultas";
import { parseAgendaDescription, onlyDigits } from "@/lib/agenda/parse-description";

export const dynamic = "force-dynamic";

function agendaConfig() {
  const baseUrl = (process.env.AGENDA_API_URL ?? "https://www.nutrithales.com.br").replace(/\/$/, "");
  const password = process.env.AGENDA_ADMIN_PASSWORD;
  if (!password) throw new Error("A integração da agenda ainda não foi configurada no painel.");
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
      ? await admin.from("consultas").select("id, google_event_id, status, auth_id").in("google_event_id", eventIds)
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
    if (!id) return NextResponse.json({ success: false, message: "Agendamento não informado." }, { status: 400 });

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
    if (!id || !CONSULTA_STATUS.includes(body.status)) {
      return NextResponse.json({ success: false, message: "Atualização inválida." }, { status: 400 });
    }

    const admin = createAdminClient();
    const db = admin as any;
    const confirmadaEm = body.status === "confirmada" ? new Date().toISOString() : undefined;
    const { data: updated, error } = await db
      .from("consultas")
      .update({ status: body.status, confirmada_em: confirmadaEm })
      .eq("google_event_id", id)
      .select("auth_id,data")
      .maybeSingle();
    if (error) throw error;

    let authId = updated?.auth_id ?? null;
    let consultaData = updated?.data ?? body.start ?? null;

    if (!updated) {
      const info = parseAgendaDescription(body.description ?? "");
      const email = info.email?.toLowerCase();
      const phone = onlyDigits(info.whatsapp);
      if (!email && !phone) {
        return NextResponse.json({
          success: false,
          message: "Este evento ainda não está vinculado a um paciente (sem e-mail/WhatsApp no agendamento). Cadastre ou vincule o paciente manualmente.",
        }, { status: 404 });
      }

      const { data: patients } = await db.from("pacientes").select("id, auth_id, email, telefone");
      const patient = (patients ?? []).find((p: any) => email && p.email?.toLowerCase() === email)
        ?? (patients ?? []).find((p: any) => phone && onlyDigits(p.telefone).slice(-11) === phone.slice(-11));
      if (!patient) {
        return NextResponse.json({
          success: false,
          message: "Nenhum paciente cadastrado corresponde a este agendamento. Cadastre o paciente manualmente e tente novamente.",
        }, { status: 404 });
      }

      const { error: insertError } = await db.from("consultas").insert({
        auth_id: patient.auth_id,
        data: body.start ?? null,
        tipo: body.title ?? null,
        status: body.status,
        modalidade: info.modalidade ?? null,
        google_event_id: id,
        origem: "agenda_site",
        confirmada_em: confirmadaEm ?? null,
      });
      if (insertError) throw insertError;
      authId = patient.auth_id;
      consultaData = body.start ?? null;
    }

    if (body.status === "realizada" && authId) {
      const agora = new Date();
      const { data: paciente } = await db
        .from("pacientes")
        .select("id,fluxo_etapa,reconsulta_intervalo_dias")
        .eq("auth_id", authId)
        .maybeSingle();
      if (paciente) {
        const intervalo = Number(paciente.reconsulta_intervalo_dias) || 45;
        const base = consultaData ? new Date(consultaData) : agora;
        const prevista = new Date(base);
        prevista.setDate(prevista.getDate() + intervalo);
        await db.from("pacientes").update({
          fluxo_etapa: "06_plano_elaboracao",
          fluxo_proxima_acao_em: null,
          proxima_reconsulta_prevista: prevista.toISOString(),
          reconsulta_intervalo_dias: intervalo,
          fluxo_updated_at: agora.toISOString(),
        }).eq("id", paciente.id);

        if (paciente.fluxo_etapa !== "06_plano_elaboracao") {
          await db.from("fluxo_movimentacoes").insert({
            paciente_id: paciente.id,
            de_etapa: paciente.fluxo_etapa,
            para_etapa: "06_plano_elaboracao",
            admin_id: null,
            observacao: `Consulta realizada pela agenda. Reconsulta sugerida em ${intervalo} dias.`,
          });
        }
      }
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    return errorResponse(error);
  }
}
