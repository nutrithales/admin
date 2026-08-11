import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/database.types";

const PUBLIC_PATHS = [
  "/login",
  "/auth",
  "/paciente/login",
  // Unauthenticated endpoints called from the public patient site
  // (nutrithales.com.br) — must stay reachable without an admin session,
  // including the CORS preflight OPTIONS request.
  "/api/pacientes/self-register",
  "/api/pacientes/forgot-password",
];

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/**
 * Refreshes the Supabase session cookie on every request and gates every
 * non-public route behind "is this user in `administradores`?". Runs in
 * the Edge middleware, so this is the first line of defense — pages still
 * rely on RLS for actual data access, this only protects page rendering.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
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
  const isPatientArea = pathname.startsWith("/paciente") && pathname !== "/paciente/login";

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
      await supabase.auth.signOut();
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
    const url = request.nextUrl.clone();
    url.pathname = patient ? "/paciente/pre-consulta" : "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}
