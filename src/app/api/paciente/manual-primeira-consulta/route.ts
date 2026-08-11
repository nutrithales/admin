import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ message: "Acesso não autorizado." }, { status: 401 });

  const { data: consultations } = await supabase
    .from("consultas")
    .select("data, tipo")
    .eq("auth_id", user.id)
    .order("data", { ascending: true });

  const firstConsultation = consultations?.find((item) => !/reconsulta|retorno|acompanhamento/i.test(item.tipo ?? ""));
  if (!firstConsultation?.data || new Date(firstConsultation.data).getTime() <= Date.now()) {
    return NextResponse.json({ message: "Este material não está mais disponível." }, { status: 410 });
  }

  const file = await readFile(path.join(process.cwd(), "private-assets", "manual-primeira-consulta.pdf"));
  return new NextResponse(file, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'inline; filename="manual-primeira-consulta.pdf"',
      "Cache-Control": "private, no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
