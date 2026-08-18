"use client";

import { useEffect, useMemo, useState } from "react";
import { BatteryCharging, Bolt, Droplets, Info, ShieldCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { createClient } from "@/lib/supabase/client";

type Suplemento = {
  ordem?: number;
  nome: string;
  marca?: string;
  categoria?: string;
  formato?: string;
  sabores?: string[];
  funcao?: string;
  orientacao?: string;
};

type Suplementacao = {
  id: string;
  titulo: string | null;
  introducao: string | null;
  itens: Suplemento[] | null;
  observacoes: string | null;
  ativo: boolean;
};

function IconeCategoria({ categoria = "" }: { categoria?: string }) {
  const texto = categoria.toLowerCase();
  if (texto.includes("eletról")) return <Droplets className="size-5" />;
  if (texto.includes("energia") || texto.includes("pré")) return <Bolt className="size-5" />;
  if (texto.includes("recuper")) return <BatteryCharging className="size-5" />;
  return <Info className="size-5" />;
}

export function SuplementacaoTab({ authId }: { authId: string | null }) {
  const supabase = useMemo(() => createClient() as any, []);
  const [data, setData] = useState<Suplementacao | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    void carregar();
  }, [authId]);

  async function carregar() {
    setLoading(true);
    setErro(null);
    if (!authId) {
      setData(null);
      setLoading(false);
      return;
    }

    const result = await supabase
      .from("suplementacao_paciente")
      .select("id,titulo,introducao,itens,observacoes,ativo")
      .eq("auth_id", authId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (result.error) {
      setErro(result.error.message ?? "Não foi possível carregar a suplementação.");
      setLoading(false);
      return;
    }

    setData(result.data as Suplementacao | null);
    setLoading(false);
  }

  if (loading) {
    return <Card><CardContent className="py-10 text-center text-sm text-muted">Carregando suplementação...</CardContent></Card>;
  }

  if (erro) {
    return <Card><CardContent className="py-10 text-center text-sm text-red-600">{erro}</CardContent></Card>;
  }

  if (!data) {
    return <Card><CardContent className="py-10 text-center text-sm text-muted">Nenhuma suplementação cadastrada para este paciente.</CardContent></Card>;
  }

  const itens = Array.isArray(data.itens)
    ? data.itens.slice().sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0))
    : [];

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-base font-bold text-ink">Suplementação do paciente</h2>
          <p className="text-sm text-muted">Visualização administrativa para validar exatamente o conteúdo vinculado à área do paciente.</p>
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
