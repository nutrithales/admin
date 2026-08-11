import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const schema = z.object({
  formId: z.string().uuid(),
  consent: z.literal(true),
  answers: z.record(z.string(), z.string().max(5000)),
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: "Respostas inválidas." }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ message: "Sessão expirada." }, { status: 401 });

  const admin = createAdminClient();
  const { data: form } = await admin.from("formularios_pre_consulta").select("id, paciente_id, auth_id").eq("id", parsed.data.formId).eq("auth_id", user.id).maybeSingle();
  if (!form) return NextResponse.json({ message: "Formulário não encontrado." }, { status: 404 });

  const now = new Date().toISOString();
  const { error } = await admin.from("formularios_pre_consulta").update({ respostas: parsed.data.answers, consentimento_dados_saude: true, status: "respondido", respondido_em: now, updated_at: now }).eq("id", form.id);
  if (error) return NextResponse.json({ message: "Não foi possível salvar." }, { status: 503 });

  await admin.from("pacientes").update({ fluxo_etapa: "05_formulario_materiais", fluxo_updated_at: now }).eq("id", form.paciente_id).eq("auth_id", user.id);
  return NextResponse.json({ success: true });
}
