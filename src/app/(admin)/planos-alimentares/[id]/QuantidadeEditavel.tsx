"use client";

import { useEffect, useState } from "react";
import { Check, Pencil, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useToast } from "@/contexts/ToastContext";
import { formatarQuantidadeComMedida } from "@/lib/nutrition/medida-caseira";
import {
  atualizarQuantidadeIngredienteAction,
  atualizarQuantidadeItemAction,
} from "@/services/plano-item-quantidade.actions";

export function QuantidadeEditavel({
  tipo,
  id,
  planoId,
  quantidadeG,
  medidasCaseiras,
  editavel,
}: {
  tipo: "item" | "ingrediente";
  id: string;
  planoId: string;
  quantidadeG: number;
  medidasCaseiras: unknown;
  editavel: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [editando, setEditando] = useState(false);
  const [valor, setValor] = useState(String(quantidadeG));
  const [salvando, setSalvando] = useState(false);

  useEffect(() => setValor(String(quantidadeG)), [quantidadeG]);

  async function salvar() {
    const numero = Number(valor.replace(",", "."));
    if (!Number.isFinite(numero) || numero <= 0) {
      toast({ kind: "error", title: "Informe uma quantidade válida." });
      return;
    }
    setSalvando(true);
    const result = tipo === "item"
      ? await atualizarQuantidadeItemAction(id, planoId, numero)
      : await atualizarQuantidadeIngredienteAction(id, planoId, numero);
    setSalvando(false);
    toast({ kind: result.success ? "success" : "error", title: result.message });
    if (result.success) {
      setEditando(false);
      router.refresh();
    }
  }

  if (!editavel || !editando) {
    return (
      <span className="inline-flex items-center gap-1.5">
        <span>{formatarQuantidadeComMedida(quantidadeG, medidasCaseiras)}</span>
        {editavel && (
          <button
            type="button"
            onClick={() => setEditando(true)}
            className="inline-flex size-6 items-center justify-center rounded-md text-muted-light transition hover:bg-bg-alt hover:text-brand-dark"
            title="Editar quantidade"
            aria-label="Editar quantidade"
          >
            <Pencil className="size-3.5" />
          </button>
        )}
      </span>
    );
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <span className="relative inline-flex items-center">
        <input
          autoFocus
          type="number"
          min="0.1"
          step="0.1"
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void salvar();
            if (e.key === "Escape") { setValor(String(quantidadeG)); setEditando(false); }
          }}
          className="h-8 w-24 rounded-md border border-brand bg-white px-2 pr-7 text-sm font-semibold text-ink outline-none ring-brand/20 focus:ring-2"
        />
        <span className="pointer-events-none absolute right-2 text-xs text-muted">g</span>
      </span>
      <button
        type="button"
        disabled={salvando}
        onClick={() => void salvar()}
        className="inline-flex size-8 items-center justify-center rounded-md bg-brand text-ink-deep disabled:opacity-50"
        title="Salvar quantidade"
      >
        <Check className="size-4" />
      </button>
      <button
        type="button"
        disabled={salvando}
        onClick={() => { setValor(String(quantidadeG)); setEditando(false); }}
        className="inline-flex size-8 items-center justify-center rounded-md text-muted hover:bg-bg-alt"
        title="Cancelar"
      >
        <X className="size-4" />
      </button>
    </span>
  );
}
