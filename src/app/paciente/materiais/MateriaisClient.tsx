"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, BookOpen, ExternalLink, FileText, PlayCircle } from "lucide-react";
import type { Tables } from "@/types/database.types";

type Conteudo = Tables<"biblioteca">;

export function MateriaisClient({ conteudos }: { conteudos: Conteudo[] }) {
  const [categoria, setCategoria] = useState("Todos");

  const categorias = useMemo(() => {
    const valores = conteudos
      .map((item) => item.categoria?.trim())
      .filter((value): value is string => Boolean(value));
    return ["Todos", ...Array.from(new Set(valores))];
  }, [conteudos]);

  const filtrados = categoria === "Todos"
    ? conteudos
    : conteudos.filter((item) => item.categoria === categoria);

  return (
    <main className="min-h-screen bg-[#EEF2EF] sm:px-4 sm:py-8">
      <div className="mx-auto min-h-screen w-full max-w-[500px] bg-[#F8FAF8] pb-[calc(28px+env(safe-area-inset-bottom))] sm:min-h-0 sm:overflow-hidden sm:rounded-[32px] sm:border sm:border-black/[0.055] sm:shadow-[0_30px_90px_rgba(14,26,20,0.12)]">
        <header className="px-5 pt-[calc(14px+env(safe-area-inset-top))] sm:pt-6">
          <Link
            href="/paciente"
            className="inline-flex size-10 items-center justify-center rounded-full border border-black/[0.06] bg-white text-[#101713] shadow-[0_4px_14px_rgba(14,26,20,0.04)]"
            aria-label="Voltar para a área do paciente"
          >
            <ArrowLeft className="size-[18px]" />
          </Link>
        </header>

        <div className="px-5">
          <section className="pt-5">
            <span className="flex size-11 items-center justify-center rounded-[15px] bg-[#0E1A14] text-[#6FF0AC]">
              <BookOpen className="size-5" />
            </span>
            <p className="mt-4 text-[9px] font-black uppercase tracking-[0.13em] text-[#159F60]">Biblioteca</p>
            <h1 className="mt-1 text-[29px] font-black leading-[1] tracking-[-0.04em] text-[#101713]">Materiais extras</h1>
            <p className="mt-2 max-w-[390px] text-[12px] leading-5 text-[#748078]">
              Guias, PDFs, vídeos e conteúdos de apoio selecionados para complementar seu acompanhamento.
            </p>
          </section>

          {categorias.length > 2 ? (
            <div className="-mx-5 mt-5 overflow-x-auto px-5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <div className="flex w-max gap-2">
                {categorias.map((item) => {
                  const ativo = categoria === item;
                  return (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setCategoria(item)}
                      className={`rounded-full px-3.5 py-2 text-[11px] font-black transition ${
                        ativo ? "bg-[#0E1A14] text-white" : "border border-black/[0.06] bg-white text-[#66726B]"
                      }`}
                    >
                      {item}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          <section className="mt-5 grid gap-3">
            {filtrados.map((item) => {
              const Icon = item.tipo === "video" ? PlayCircle : item.tipo === "link" ? ExternalLink : FileText;
              const tipoLabel = item.tipo === "video" ? "Vídeo" : item.tipo === "link" ? "Link" : "PDF";

              return (
                <a
                  key={item.id}
                  href={`/paciente/materiais/${item.id}/arquivo`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full rounded-[20px] border border-black/[0.055] bg-white p-4 text-left shadow-[0_7px_20px_rgba(14,26,20,0.035)] transition active:scale-[0.99]"
                >
                  <div className="flex items-start gap-3.5">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-[13px] bg-[#EDF7F1] text-[#159F60]">
                      <Icon className="size-[18px]" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <h2 className="text-[14px] font-black leading-[18px] tracking-[-0.01em] text-[#101713]">{item.titulo}</h2>
                        <span className="shrink-0 rounded-full bg-[#F1F4F2] px-2 py-1 text-[8px] font-black uppercase tracking-[0.08em] text-[#748078]">
                          {tipoLabel}
                        </span>
                      </div>
                      {item.descricao ? <p className="mt-1.5 text-[11px] leading-[16px] text-[#7D8882]">{item.descricao}</p> : null}
                      {item.categoria ? <p className="mt-2 text-[9px] font-black uppercase tracking-[0.08em] text-[#159F60]">{item.categoria}</p> : null}
                    </div>
                  </div>
                </a>
              );
            })}
          </section>
        </div>
      </div>
    </main>
  );
}
