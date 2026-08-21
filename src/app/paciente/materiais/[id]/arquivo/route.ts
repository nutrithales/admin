import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const DEFAULT_BUCKET = "biblioteca";

function safeFilename(title: string, path: string) {
  const extension = path.includes(".") ? path.slice(path.lastIndexOf(".")) : "";
  const base = title
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "") || "material";

  return `${base}${extension}`;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/paciente/login", request.url));
  }

  const { data: paciente } = await supabase
    .from("pacientes")
    .select("status")
    .eq("auth_id", user.id)
    .maybeSingle();

  if (!paciente || String(paciente.status || "").toLowerCase() !== "ativo") {
    return new NextResponse("Material disponível somente para pacientes ativos.", {
      status: 403,
      headers: { "Cache-Control": "private, no-store" },
    });
  }

  const { data: conteudo, error } = await supabase
    .from("biblioteca")
    .select("titulo,tipo,url,path,bucket,ativo")
    .eq("id", id)
    .eq("ativo", true)
    .maybeSingle();

  if (error || !conteudo) {
    return new NextResponse("Material não encontrado.", {
      status: 404,
      headers: { "Cache-Control": "private, no-store" },
    });
  }

  if (conteudo.tipo === "link") {
    if (!conteudo.url) {
      return new NextResponse("Link indisponível.", {
        status: 404,
        headers: { "Cache-Control": "private, no-store" },
      });
    }

    try {
      const externalUrl = new URL(conteudo.url);
      if (!['http:', 'https:'].includes(externalUrl.protocol)) throw new Error("invalid protocol");
      return NextResponse.redirect(externalUrl);
    } catch {
      return new NextResponse("Link inválido.", {
        status: 400,
        headers: { "Cache-Control": "private, no-store" },
      });
    }
  }

  if (!conteudo.path) {
    return new NextResponse("Arquivo indisponível.", {
      status: 404,
      headers: { "Cache-Control": "private, no-store" },
    });
  }

  const bucket = conteudo.bucket || DEFAULT_BUCKET;
  const { data: file, error: downloadError } = await supabase.storage
    .from(bucket)
    .download(conteudo.path);

  if (downloadError || !file) {
    return new NextResponse("Não foi possível abrir este material.", {
      status: 502,
      headers: { "Cache-Control": "private, no-store" },
    });
  }

  const filename = safeFilename(conteudo.titulo || "material", conteudo.path);
  const encodedFilename = encodeURIComponent(filename);

  return new Response(file, {
    status: 200,
    headers: {
      "Content-Type": file.type || "application/octet-stream",
      "Content-Disposition": `inline; filename="${filename}"; filename*=UTF-8''${encodedFilename}`,
      "Cache-Control": "private, no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
