import "server-only";
import { createClient } from "@/lib/supabase/server";

/**
 * Verifies the current request is authenticated as an administrador and
 * returns the signed-in user. Throws otherwise. Server Actions must call
 * this before touching the service-role client — middleware already
 * blocks page navigation for non-admins, but Server Actions can be
 * invoked directly and need their own check.
 */
export async function assertAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Não autenticado.");

  const { data: admin } = await supabase
    .from("administradores")
    .select("id")
    .eq("auth_id", user.id)
    .maybeSingle();

  if (!admin) throw new Error("Acesso restrito a administradores.");

  return user;
}
