import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdminShell } from "@/components/layout/AdminShell";
import { ToastProvider } from "@/contexts/ToastContext";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: admin } = await supabase
    .from("administradores")
    .select("nome, foto_url")
    .eq("auth_id", user.id)
    .maybeSingle();

  // Middleware already blocks non-admins from reaching this layout; this
  // is a defense-in-depth check in case it is ever rendered without it.
  if (!admin) redirect("/login?error=not-admin");

  return (
    <ToastProvider>
      <AdminShell
        adminName={admin.nome ?? user.email ?? "Administrador"}
        adminEmail={user.email ?? ""}
        adminPhotoUrl={admin.foto_url}
      >
        {children}
      </AdminShell>
    </ToastProvider>
  );
}
