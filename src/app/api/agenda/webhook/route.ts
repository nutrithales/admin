import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { includedConsultations, normalizePlan } from "@/lib/agenda/plans";

const bookingSchema = z.object({
  eventId: z.string().min(1),
  name: z.string().trim().min(3),
  cpf: z.string().trim().min(11),
  email: z.string().trim().email(),
  phone: z.string().trim().min(10),
  birthDate: z.string().date().optional(),
  plan: z.string().trim().optional(),
  mode: z.string().trim().optional(),
  serviceTitle: z.string().trim().min(1),
  start: z.string().datetime(),
  notes: z.string().optional(),
});

function digits(value?: string | null) {
  return (value ?? "").replace(/\D/g, "");
}

function authorized(request: NextRequest) {
  const secret = process.env.AGENDA_SYNC_SECRET;
  return Boolean(secret && request.headers.get("authorization") === `Bearer ${secret}`);
}

export async function POST(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ success: false, message: "Acesso não autorizado." }, { status: 401 });
  }

  const parsed = bookingSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ success: false, message: "Dados do agendamento inválidos." }, { status: 400 });
  }

  const booking = parsed.data;
  const admin = createAdminClient();

  const { data: existingConsultation } = await admin
    .from("consultas")
    .select("id")
    .eq("google_event_id", booking.eventId)
    .maybeSingle();

  if (existingConsultation) {
    return NextResponse.json({ success: true, duplicate: true });
  }

  const { data: patients, error: patientsError } = await admin
    .from("pacientes")
    .select("id, auth_id, cpf, email, telefone");

  if (patientsError) {
    return NextResponse.json({ success: false, message: patientsError.message }, { status: 503 });
  }

  const cpf = digits(booking.cpf);
  const phone = digits(booking.phone);
  const email = booking.email.toLowerCase();
  let patient = (patients ?? []).find((item) => digits(item.cpf) === cpf)
    ?? (patients ?? []).find((item) => item.email?.toLowerCase() === email)
    ?? (patients ?? []).find((item) => digits(item.telefone).slice(-11) === phone.slice(-11));
  let createdPatient = false;

  if (!patient) {
    const password = `${crypto.randomUUID()}Aa1!`;
    let authId: string | undefined;
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { nome: booking.name },
    });

    if (created.user) {
      authId = created.user.id;
    } else if (createError) {
      const { data: users } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      authId = users.users.find((user) => user.email?.toLowerCase() === email)?.id;
    }

    if (!authId) {
      return NextResponse.json(
        { success: false, message: "Não foi possível criar ou localizar o acesso do paciente." },
        { status: 503 },
      );
    }

    const plan = normalizePlan(booking.plan);
    const { data: inserted, error: insertPatientError } = await admin
      .from("pacientes")
      .insert({
        auth_id: authId,
        nome: booking.name,
        cpf,
        email,
        telefone: phone,
        data_nascimento: booking.birthDate ?? null,
        plano: plan,
        consultas_incluidas: includedConsultations(plan),
        consultas_realizadas_iniciais: 0,
        status: "pendente",
        data_inicio: new Date().toISOString().slice(0, 10),
        fluxo_etapa: "04_agendado",
        fluxo_updated_at: new Date().toISOString(),
      })
      .select("id, auth_id, cpf, email, telefone")
      .single();

    if (insertPatientError || !inserted) {
      if (created.user) await admin.auth.admin.deleteUser(created.user.id);
      return NextResponse.json(
        { success: false, message: insertPatientError?.message ?? "Erro ao cadastrar paciente." },
        { status: 503 },
      );
    }
    patient = inserted;
    createdPatient = true;
  }

  const { error: consultationError } = await admin.from("consultas").insert({
    auth_id: patient.auth_id,
    data: booking.start,
    tipo: booking.serviceTitle,
    status: "agendada",
    modalidade: booking.mode ?? null,
    observacoes: booking.notes || null,
    google_event_id: booking.eventId,
    origem: "agenda_site",
  });

  if (consultationError) {
    return NextResponse.json({ success: false, message: consultationError.message }, { status: 503 });
  }

  const isReturn = /reconsulta|retorno|acompanhamento/i.test(booking.serviceTitle);
  let preConsultationEmailSent = false;
  if (!isReturn) {
    await admin.from("formularios_pre_consulta").upsert(
      {
        paciente_id: patient.id,
        auth_id: patient.auth_id,
        status: "pendente",
        solicitado_em: new Date().toISOString(),
      },
      { onConflict: "paciente_id", ignoreDuplicates: true },
    );

    const redirectTo = new URL("/paciente/pre-consulta", request.nextUrl.origin).toString();
    const { error: emailError } = await admin.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo, shouldCreateUser: false },
    });
    preConsultationEmailSent = !emailError;
  }
  await admin.from("pacientes").update({
    fluxo_etapa: isReturn ? "04_1_agendado_reconsulta" : "04_agendado",
    fluxo_updated_at: new Date().toISOString(),
  }).eq("id", patient.id);

  return NextResponse.json(
    { success: true, patientId: patient.id, createdPatient, preConsultationEmailSent },
    { status: 201 },
  );
}
