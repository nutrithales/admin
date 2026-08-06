"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { findSubstitutosAction, type SubstitutoOption } from "@/services/alimentos.actions";

export function SubstituirModal({
  open,
  onClose,
  alimentoId,
  alimentoNome,
  quantidadeG,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  alimentoId: string;
  alimentoNome: string;
  quantidadeG: number;
  onConfirm: (novoAlimentoId: string) => Promise<void>;
}) {
  const [opcoes, setOpcoes] = useState<SubstitutoOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [aplicando, setAplicando] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    findSubstitutosAction(alimentoId, quantidadeG).then((r) => {
      setOpcoes(r);
      setLoading(false);
    });
  }, [open, alimentoId, quantidadeG]);

  async function handlePick(opcao: SubstitutoOption) {
    setAplicando(opcao.id);
    await onConfirm(opcao.id);
    setAplicando(null);
  }

  const fator = quantidadeG / 100;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Substituir "${alimentoNome}"`}
      description={`Opções nutricionalmente parecidas na mesma quantidade (${Math.round(quantidadeG)}g) — não muda o resto da refeição.`}
    >
      {loading ? (
        <p className="text-sm text-muted">Buscando opções...</p>
      ) : opcoes.length === 0 ? (
        <p className="text-sm text-muted">Nenhuma opção parecida encontrada na base.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {opcoes.map((o) => (
            <button
              key={o.id}
              type="button"
              disabled={aplicando !== null}
              onClick={() => handlePick(o)}
              className="flex items-center justify-between gap-3 rounded-lg border border-border p-3 text-left transition-colors hover:bg-bg-alt-2 disabled:opacity-50"
            >
              <div>
                <p className="font-semibold text-ink">{o.nome}</p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  <Badge tone="muted">{Math.round(o.kcal_100g * fator)} kcal</Badge>
                  <Badge tone="muted">{(o.proteina_100g * fator).toFixed(1)}g P</Badge>
                  <Badge tone="muted">{(o.carboidrato_100g * fator).toFixed(1)}g C</Badge>
                  <Badge tone="muted">{(o.gordura_100g * fator).toFixed(1)}g G</Badge>
                </div>
              </div>
              {aplicando === o.id && <span className="shrink-0 text-xs text-muted-light">Aplicando...</span>}
            </button>
          ))}
        </div>
      )}
      <div className="mt-4 flex justify-end">
        <Button type="button" variant="ghost" onClick={onClose}>
          Fechar
        </Button>
      </div>
    </Modal>
  );
}
