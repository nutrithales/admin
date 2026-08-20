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
