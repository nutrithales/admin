import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/database.types";
import { SUPABASE_URL } from "@/lib/supabase/config";

const PUBLIC_PATHS = [
  "/login",
  "/auth",
  "/redefinir-admin",
  "/api/auth/admin-reset",
  "/paciente/login",
  "/preview-plano-alimentar",
  "/f",
  "/api/auth/recover",
  "/api/pacientes/self-register",
  "/api/pacientes/forgot-password",
  "/api/agenda/webhook",
];

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isPatientArea =
    (pathname === "/paciente" || pathname.startsWith("/paciente/")) &&
    pathname !== "/paciente/login";

  if (!user && !isPublicPath(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  if (user && isPatientArea) {
    const { data: patient } = await supabase
      .from("pacientes")
      .select("id")
      .eq("auth_id", user.id)
      .maybeSingle();

    if (!patient) {
      const url = request.nextUrl.clone();
      url.pathname = "/paciente/login";
      url.searchParams.set("error", "not-patient");
      return NextResponse.redirect(url);
    }
  } else if (user && !isPublicPath(pathname)) {
    const { data: admin } = await supabase
      .from("administradores")
      .select("id")
      .eq("auth_id", user.id)
      .maybeSingle();

    if (!admin) {
      await supabase.auth.signOut();
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("error", "not-admin");
      return NextResponse.redirect(url);
    }
  }

  if (user && pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (user && pathname === "/paciente/login") {
    const { data: patient } = await supabase
      .from("pacientes")
      .select("id")
      .eq("auth_id", user.id)
      .maybeSingle();

    if (patient) {
      const url = request.nextUrl.clone();
      url.pathname = "/paciente";
      url.search = "";
      return NextResponse.redirect(url);
    }

    // Uma sessão administrativa não deve sequestrar a entrada da Área do Paciente.
    // Mantemos a tela de login do paciente visível para validação e novo acesso.
    return response;
  }

  return response;
}
