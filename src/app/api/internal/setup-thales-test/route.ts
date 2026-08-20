import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateTemporaryPassword } from "@/utils/generate-password";

const TOKEN = "thales-test-20260820-7f2c8d91";
const EMAIL = "thales_acr@hotmail.com";
const NOME = "Thales Rosa";
const LEANDRO_ID = "6cd3305e-c66a-41bd-b958-2b67053377fe";

export async function GET(request: NextRequest) {
  if (request.nextUrl.searchParams.get("token") !== TOKEN) {
    return NextResponse.json({ success: false }, { status: 404 });
  }

  const admin = createAdminClient();

  const { data: existingPatient } = await admin
    .from("pacientes")
    .select("id, auth_id, email")
    .eq("email", EMAIL)
    .maybeSingle();

  if (existingPatient) {
    return NextResponse.json({
      success: false,
      message: "Já existe paciente com este e-mail.",
      pacienteId: existingPatient.id,
    });
  }

  const password = generateTemporaryPassword();
  const { data: created, error: authError } = await admin.auth.admin.createUser({
    email: EMAIL,
    password,
    email_confirm: true,
    user_metadata: { nome: NOME },
  });

  if (authError || !created.user) {
    return NextResponse.json(
      { success: false, message: authError?.message ?? "Falha ao criar usuário." },
      { status: 400 },
    );
  }

  const { data: patient, error: patientError } = await admin
    .from("pacientes")
    .insert({
      auth_id: created.user.id,
      nome: NOME,
      email: EMAIL,
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
    return NextResponse.json(
      { success: false, message: patientError?.message ?? "Falha ao criar paciente." },
      { status: 500 },
    );
  }

  const { data: sourcePrograms, error: programsError } = await admin
    .from("treino_programas")
    .select("*")
    .eq("paciente_id", LEANDRO_ID)
    .order("ordem", { ascending: true });

  if (programsError || !sourcePrograms) {
    await admin.from("pacientes").delete().eq("id", patient.id);
    await admin.auth.admin.deleteUser(created.user.id);
    return NextResponse.json(
      { success: false, message: programsError?.message ?? "Falha ao buscar treinos do Leandro." },
      { status: 500 },
    );
  }

  let exercisesCopied = 0;
  for (const source of sourcePrograms) {
    const { data: newProgram, error: programInsertError } = await admin
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

    if (programInsertError || !newProgram) {
      return NextResponse.json(
        { success: false, message: programInsertError?.message ?? "Falha ao copiar programa." },
        { status: 500 },
      );
    }

    const { data: sourceExercises, error: exercisesError } = await admin
      .from("treino_exercicios")
      .select("*")
      .eq("treino_id", source.id)
      .order("ordem", { ascending: true });

    if (exercisesError) {
      return NextResponse.json(
        { success: false, message: exercisesError.message },
        { status: 500 },
      );
    }

    if (sourceExercises?.length) {
      const rows = sourceExercises.map((exercise) => ({
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

      const { error: exerciseInsertError } = await admin.from("treino_exercicios").insert(rows);
      if (exerciseInsertError) {
        return NextResponse.json(
          { success: false, message: exerciseInsertError.message },
          { status: 500 },
        );
      }
      exercisesCopied += rows.length;
    }
  }

  return NextResponse.json({
    success: true,
    pacienteId: patient.id,
    authId: created.user.id,
    email: EMAIL,
    password,
    programasCopiados: sourcePrograms.length,
    exerciciosCopiados: exercisesCopied,
  });
}
