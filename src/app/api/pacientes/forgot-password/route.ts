import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateTemporaryPassword } from "@/utils/generate-password";
import { sendPatientCredentialsEmail } from "@/lib/email/patient-credentials";
import { pacienteForgotPasswordSchema } from "@/utils/validation/paciente";
import { corsHeaders } from "@/lib/http/cors";

// Public, unauthenticated endpoint — generates a new temporary password and
// emails it, the same mechanism as the admin's "Resetar senha" action. The
// response is deliberately identical whether or not the e-mail is on file,
// so this can't be used to check which addresses are registered patients.

const GENERIC_MESSAGE = "Se esse e-mail estiver cadastrado, você vai receber uma nova senha em instantes.";

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

  const parsed = pacienteForgotPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, message: parsed.error.issues[0]?.message ?? "Dados inválidos." },
      { status: 400, headers },
    );
  }
  const data = parsed.data;

  // Honeypot: real visitors never populate this hidden field. Pretend
  // success without doing anything.
  if (data.website) {
    return NextResponse.json({ success: true, message: GENERIC_MESSAGE }, { headers });
  }

  const admin = createAdminClient();

  const { data: existing } = await admin
    .from("pacientes")
    .select("auth_id, nome, status")
    .eq("email", data.email)
    .maybeSingle();

  if (existing?.auth_id) {
    const password = generateTemporaryPassword();
    const { error } = await admin.auth.admin.updateUserById(existing.auth_id, { password });
    if (!error) {
      await sendPatientCredentialsEmail({
        to: data.email,
        nome: existing.nome ?? "",
        password,
        pendingApproval: existing.status === "pendente",
      });
    }
  }

  return NextResponse.json({ success: true, message: GENERIC_MESSAGE }, { headers });
}
