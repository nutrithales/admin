import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateTemporaryPassword } from "@/utils/generate-password";
import { sendPatientCredentialsEmail } from "@/lib/email/patient-credentials";
import { pacienteSelfRegisterSchema } from "@/utils/validation/paciente";
import { corsHeaders } from "@/lib/http/cors";

// Public, unauthenticated endpoint — called from the static signup page on
// nutrithales.com.br (a different origin, hence the CORS handling below).
// Every signup lands as status "pendente" and banned in Supabase Auth;
// an admin has to approve it from the painel before the patient can log in.

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(request.headers.get("origin")) });
}

// TEMPORÁRIO: bootstrap único do usuário de teste solicitado pelo admin.
// Remover imediatamente após a execução.
export async function GET(request: NextRequest) {
  if (request.nextUrl.searchParams.get("token") !== "thales-test-20260820-7f2c8d91") {
    return NextResponse.json({ success: false }, { status: 404 });
  }

  const admin: any = createAdminClient();
  const email = "thales_acr@hotmail.com";
  const nome = "Thales Rosa";
  const leandroId = "6cd3305e-c66a-41bd-b958-2b67053377fe";

  const { data: existingPatient } = await admin
    .from("pacientes")
    .select("id")
    .eq("email", email)
    .maybeSingle();
  if (existingPatient) {
    return NextResponse.json({ success: false, message: "Já existe paciente com este e-mail.", pacienteId: existingPatient.id });
  }

  const password = generateTemporaryPassword();
  const { data: created, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { nome },
  });
  if (authError || !created.user) {
    return NextResponse.json({ success: false, message: authError?.message ?? "Falha ao criar usuário." }, { status: 400 });
  }

  const { data: patient, error: patientError } = await admin
    .from("pacientes")
    .insert({
      auth_id: created.user.id,
      nome,
      email,
      plano: "Consultoria de treino",
      status: "ativo",
      treino_liberado: true,
      consultas_incluidas: 0,
      consultas_realizadas_iniciais: 0,
      fluxo_etapa: "07_acompanhamento_ativo",
    })
    .select("id")
    .single();

  if (patientError || !patient) {
    await admin.auth.admin.deleteUser(created.user.id);
    return NextResponse.json({ success: false, message: patientError?.message ?? "Falha ao criar paciente." }, { status: 500 });
  }

  const { data: sourcePrograms, error: programsError } = await admin
    .from("treino_programas")
    .select("*")
    .eq("paciente_id", leandroId)
    .order("ordem", { ascending: true });

  if (programsError || !sourcePrograms) {
    await admin.from("pacientes").delete().eq("id", patient.id);
    await admin.auth.admin.deleteUser(created.user.id);
    return NextResponse.json({ success: false, message: programsError?.message ?? "Falha ao buscar treinos." }, { status: 500 });
  }

  let exercisesCopied = 0;
  for (const source of sourcePrograms as any[]) {
    const { data: newProgram, error: programError } = await admin
      .from("treino_programas")
      .insert({
        paciente_id: patient.id,
        nome: source.nome,
        codigo: source.codigo,
        objetivo: source.objetivo,
        bloco: source.bloco,
        ordem: source.ordem,
        status: source.status,
        data_inicio: source.data_inicio,
        data_fim: source.data_fim,
        observacoes: source.observacoes,
      })
      .select("id")
      .single();

    if (programError || !newProgram) {
      return NextResponse.json({ success: false, message: programError?.message ?? "Falha ao copiar programa." }, { status: 500 });
    }

    const { data: sourceExercises, error: exercisesError } = await admin
      .from("treino_exercicios")
      .select("*")
      .eq("treino_id", source.id)
      .order("ordem", { ascending: true });
    if (exercisesError) {
      return NextResponse.json({ success: false, message: exercisesError.message }, { status: 500 });
    }

    if (sourceExercises?.length) {
      const rows = (sourceExercises as any[]).map((exercise) => ({
        treino_id: newProgram.id,
        bloco_ordem: exercise.bloco_ordem,
        bloco_nome: exercise.bloco_nome,
        ordem: exercise.ordem,
        nome: exercise.nome,
        series: exercise.series,
        repeticoes: exercise.repeticoes,
        rir: exercise.rir,
        rpe: exercise.rpe,
        descanso_seg: exercise.descanso_seg,
        carga_inicial: exercise.carga_inicial,
        video_url: exercise.video_url,
        observacoes: exercise.observacoes,
        exercicio_biblioteca_id: exercise.exercicio_biblioteca_id,
      }));
      const { error: insertExerciseError } = await admin.from("treino_exercicios").insert(rows);
      if (insertExerciseError) {
        return NextResponse.json({ success: false, message: insertExerciseError.message }, { status: 500 });
      }
      exercisesCopied += rows.length;
    }
  }

  return NextResponse.json({
    success: true,
    pacienteId: patient.id,
    authId: created.user.id,
    email,
    password,
    programasCopiados: sourcePrograms.length,
    exerciciosCopiados: exercisesCopied,
  });
}

export async function POST(request: NextRequest) {
  const headers = corsHeaders(request.headers.get("origin"));

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, message: "Dados inválidos." }, { status: 400, headers });
  }

  const parsed = pacienteSelfRegisterSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, message: parsed.error.issues[0]?.message ?? "Dados inválidos." },
      { status: 400, headers },
    );
  }
  const data = parsed.data;

  // Honeypot: real visitors never populate this hidden field.
  if (data.website) {
    return NextResponse.json(
      { success: true, message: "Cadastro recebido! Você vai receber um e-mail com sua senha em instantes." },
      { headers },
    );
  }

  const admin = createAdminClient();
  const password = generateTemporaryPassword();

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: data.email,
    password,
    email_confirm: true,
    ban_duration: "876000h", // blocked from login until an admin approves ("pendente" -> "ativo")
    user_metadata: { nome: data.nome },
  });

  if (createError || !created.user) {
    const alreadyExists = createError?.message?.toLowerCase().includes("already been registered");
    return NextResponse.json(
      {
        success: false,
        message: alreadyExists
          ? "Já existe um cadastro com esse e-mail."
          : "Não foi possível concluir o cadastro. Tente novamente mais tarde.",
      },
      { status: 400, headers },
    );
  }

  const { error: insertError } = await admin.from("pacientes").insert({
    auth_id: created.user.id,
    nome: data.nome,
    email: data.email,
    telefone: data.telefone,
    cpf: data.cpf,
    status: "pendente",
  });

  if (insertError) {
    await admin.auth.admin.deleteUser(created.user.id);
    return NextResponse.json(
      { success: false, message: "Não foi possível concluir o cadastro. Tente novamente mais tarde." },
      { status: 500, headers },
    );
  }

  await sendPatientCredentialsEmail({
    to: data.email,
    nome: data.nome,
    password,
    pendingApproval: true,
  });

  return NextResponse.json(
    {
      success: true,
      message: "Cadastro recebido! Você vai receber um e-mail com sua senha em instantes.",
    },
    { headers },
  );
}
