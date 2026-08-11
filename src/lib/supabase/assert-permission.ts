import "server-only";
import { createClient } from "@/lib/supabase/server";
import { nivelPermite, type NivelAdmin, type PermissaoAcao } from "@/lib/clara/permissoes";

/**
 * Como `assertAdmin`, mas também devolve o nível do administrador
 * (admin | secretaria) — `nivel` nulo no banco é tratado como "admin" por
 * compatibilidade com os administradores já cadastrados antes da Clara.
 */
export async function assertAdminComNivel() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Não autenticado.");

  const { data: admin } = await supabase
    .from("administradores")
    .select("id, nivel")
    .eq("auth_id", user.id)
    .maybeSingle();

  if (!admin) throw new Error("Acesso restrito a administradores.");

  const nivel: NivelAdmin = admin.nivel === "secretaria" ? "secretaria" : "admin";
  return { user, adminId: admin.id, nivel };
}

/** Verifica autenticação + permissão para uma ação específica. Lança erro
 * com mensagem amigável (mostrada via toast) quando a secretária tenta uma
 * ação restrita ao administrador. Server Actions devem sempre validar isso
 * no servidor — a UI apenas evita mostrar a ação para quem não pode usá-la. */
export async function assertPermission(acao: PermissaoAcao) {
  const { user, adminId, nivel } = await assertAdminComNivel();
  if (!nivelPermite(nivel, acao)) {
    throw new Error("Essa ação é restrita ao administrador do consultório.");
  }
  return { user, adminId, nivel };
}
