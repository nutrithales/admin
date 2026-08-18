"use client";

import { BatteryCharging, Bolt, Droplets, Info, ShieldCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";

export type SuplementoAdmin = {
  ordem?: number;
  nome: string;
  marca?: string;
  categoria?: string;
  formato?: string;
  sabores?: string[];
  funcao?: string;
  orientacao?: string;
};

export type SuplementacaoAdmin = {
  id: string;
  titulo: string | null;
  introducao: string | null;
  itens: SuplementoAdmin[] | null;
  observacoes: string | null;
  ativo: boolean;
};

function IconeCategoria({ categoria = "" }: { categoria?: string }) {
  const texto = categoria.toLowerCase();
  if (texto.includes("eletról")) return <Droplets className="size-5" />;
  if (texto.includes("energia") || texto.includes("pré") || texto.includes("longão")) return <Bolt className="size-5" />;
  if (texto.includes("recuper")) return <BatteryCharging className="size-5" />;
  return <Info className="size-5" />;
}

export function SuplementacaoTab({ data }: { data: SuplementacaoAdmin | null }) {
  if (!data) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted">
          Nenhuma suplementação cadastrada para este paciente.
        </CardContent>
      </Card>
    );
  }

  const itens = Array.isArray(data.itens)
    ? data.itens.slice().sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0))
    : [];

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-base font-bold text-ink">Suplementação do paciente</h2>
          <p className="text-sm text-muted">Visualização administrativa do conteúdo liberado na Área do Paciente.</p>
        </div>
        <span className={`w-fit rounded-full px-3 py-1 text-xs font-bold ${data.ativo ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}`}>
          {data.ativo ? "Ativa para o paciente" : "Inativa"}
        </span>
      </div>

      <Card>
        <CardContent className="pt-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-dark">Título exibido</p>
          <h3 className="mt-1 text-xl font-bold text-ink">{data.titulo || "Suplementação"}</h3>
          {data.introducao && <p className="mt-3 whitespace-pre-line text-sm leading-6 text-muted">{data.introducao}</p>}
          <p className="mt-3 text-xs font-semibold text-muted">{itens.length} {itens.length === 1 ? "item cadastrado" : "itens cadastrados"}</p>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {itens.map((item, index) => (
          <Card key={`${item.nome}-${index}`}>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-light text-brand-dark">
                  <IconeCategoria categoria={item.categoria} />
                </span>
                {item.formato && <span className="rounded-full bg-bg-alt px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-muted">{item.formato}</span>}
              </div>

              <p className="mt-4 text-[10px] font-bold uppercase tracking-wide text-brand-dark">{item.categoria || "Suplemento"}</p>
              <h3 className="mt-1 text-lg font-bold text-ink">{item.nome}</h3>
              {item.marca && <p className="mt-1 text-sm font-semibold text-muted">{item.marca}</p>}

              {item.sabores && item.sabores.length > 0 && (
                <p className="mt-3 text-sm leading-6 text-muted"><span className="font-bold text-ink">Sabores:</span> {item.sabores.join(", ")}</p>
              )}

              {item.funcao && (
                <div className="mt-4 rounded-xl bg-bg-alt p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">Função na estratégia</p>
                  <p className="mt-1.5 whitespace-pre-line text-sm leading-6 text-ink">{item.funcao}</p>
                </div>
              )}

              {item.orientacao && (
                <div className="mt-3 rounded-xl border border-brand/20 bg-brand-light/60 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-brand-dark">Orientação exibida ao paciente</p>
                  <p className="mt-1.5 whitespace-pre-line text-sm leading-6 text-ink">{item.orientacao}</p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {data.observacoes && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-brand-dark">
              <ShieldCheck className="size-5" />
              <p className="text-xs font-bold uppercase tracking-wide">Estratégia individual</p>
            </div>
            <p className="mt-3 whitespace-pre-line text-sm leading-6 text-ink">{data.observacoes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
