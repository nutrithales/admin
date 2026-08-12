import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";

const ADMIN_USER_ID = "7d330821-272c-4ac6-abf4-f392ecf39757";
const RESET_TOKEN_HASH = "9672b1a4e00ff12f3b23b64034de8c80657462fd6dffbaa1e853f311e5a6b061";
const RESET_EXPIRES_AT = new Date("2026-08-12T05:26:54Z");

const resetSchema = z.object({
  token: z.string().length(64),
  password: z
    .string()
    .min(10, "A nova senha deve ter pelo menos 10 caracteres.")
    .max(128),
});

function tokenMatches(token: string) {
  const received = Buffer.from(createHash("sha256").update(token).digest("hex"), "utf8");
  const expected = Buffer.from(RESET_TOKEN_HASH, "utf8");
  return received.length === expected.length && timingSafeEqual(received, expected);
}

export async function POST(request: Request) {
  const parsed = resetSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success || !tokenMatches(parsed.data.token)) {
    return NextResponse.json(
      { ok: false, message: "Este link de redefinição é inválido." },
      { status: 403 },
    );
  }

  if (new Date() > RESET_EXPIRES_AT) {
    return NextResponse.json(
      { ok: false, message: "Este link expirou. Solicite um novo link administrativo." },
      { status: 410 },
    );
  }

  const admin = createAdminClient();
  const { data: current, error: lookupError } = await admin.auth.admin.getUserById(ADMIN_USER_ID);

  if (lookupError || !current.user) {
    console.error("[admin-reset] Não foi possível localizar o administrador:", lookupError?.message);
    return NextResponse.json(
      { ok: false, message: "Não foi possível localizar a conta administrativa." },
      { status: 500 },
    );
  }

  if (current.user.app_metadata?.password_reset_token_used === RESET_TOKEN_HASH) {
    return NextResponse.json(
      { ok: false, message: "Este link já foi utilizado." },
      { status: 410 },
    );
  }

  const { error } = await admin.auth.admin.updateUserById(ADMIN_USER_ID, {
    password: parsed.data.password,
    app_metadata: {
      ...current.user.app_metadata,
      password_reset_token_used: RESET_TOKEN_HASH,
      password_reset_at: new Date().toISOString(),
    },
  });

  if (error) {
    console.error("[admin-reset] Falha ao definir a nova senha:", error.message);
    return NextResponse.json(
      { ok: false, message: "Não foi possível definir a nova senha agora." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
