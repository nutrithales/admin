"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Combobox } from "@/components/ui/Combobox";
import { QuantityStepper } from "@/components/ui/QuantityStepper";
import { addReceitaAoPlanoAction, addAlimentoAvulsoAoPlanoAction } from "@/services/planos-estruturados.actions";
import { searchReceitasAction } from "@/services/receitas.actions";
import { searchAlimentosAction } from "@/services/alimentos.actions";
import type { ReceitaOption } from "@/services/receitas.queries";
import type { AlimentoOption } from "@/services/alimentos.queries";
import { useToast } from "@/contexts/ToastContext";

export function AddItemModal({
  open,
  onClose,
  onAdded,
  planoRefeicaoId,
  planoId,
}: {
  open: boolean;
  onClose: () => void;
  onAdded: () => void;
  planoRefeicaoId: string;
  planoId: string;
}) {
  const { toast } = useToast();
  const [tipo, setTipo] = useState<"receita" | "alimento">("receita");
  const [receita, setReceita] = useState<ReceitaOption | null>(null);
  const [alimento, setAlimento] = useState<AlimentoOption | null>(null);
  const [quantidade, setQuantidade] = useState(100);
  const [saving, setSaving] = useState(false);

  function fechar() {
    setReceita(null);
    setAlimento(null);
    setQuantidade(100);
    setTipo("receita");
    onClose();
  }

  async function handleAdd() {
    if (tipo === "receita" && !receita) {
      toast({ kind: "error", title: "Escolha uma receita." });
      return;
    }
    if (tipo === "alimento" && !alimento) {
      toast({ kind: "error", title: "Escolha um alimento." });
      return;
    }

    setSaving(true);
    const result =
      tipo === "receita"
        ? await addReceitaAoPlanoAction(planoRefeicaoId, planoId, receita!.id)
        : await addAlimentoAvulsoAoPlanoAction(planoRefeicaoId, planoId, alimento!.id, quantidade);
    setSaving(false);

    if (result.success) {
      toast({ kind: "success", title: result.message });
      if ("avisos" in result && result.avisos?.length) {
        for (const aviso of result.avisos) toast({ kind: "warning", title: aviso });
      }
      onAdded();
      fechar();
    } else {
      toast({ kind: "error", title: "Não foi possível adicionar", description: result.message });
    }
  }

  return (
    <Modal open={open} onClose={fechar} title="Adicionar à refeição">
      <div className="flex flex-col gap-4">
        <div className="flex w-fit overflow-hidden rounded-md border border-border text-sm font-semibold">
          <button
            type="button"
            onClick={() => setTipo("receita")}
            className={`px-4 py-2 transition-colors ${tipo === "receita" ? "bg-brand text-ink-deep" : "bg-surface text-muted hover:bg-bg-alt"}`}
          >
            Receita
          </button>
          <button
            type="button"
            onClick={() => setTipo("alimento")}
            className={`px-4 py-2 transition-colors ${tipo === "alimento" ? "bg-brand text-ink-deep" : "bg-surface text-muted hover:bg-bg-alt"}`}
          >
            Alimento avulso
          </button>
        </div>

        {tipo === "receita" ? (
          <Combobox<ReceitaOption>
            placeholder="Buscar receita..."
            selectedLabel={receita?.nome}
            value={receita?.id}
            onQueryChange={async (q) => (await searchReceitasAction(q)).map((r) => ({ value: r.id, label: r.nome, data: r }))}
            onChange={(_, option) => setReceita(option.data ?? null)}
          />
        ) : (
          <>
            <Combobox<AlimentoOption>
              placeholder="Buscar alimento..."
              selectedLabel={alimento?.nome}
              value={alimento?.id}
              onQueryChange={async (q) => (await searchAlimentosAction(q)).map((a) => ({ value: a.id, label: a.nome, data: a }))}
              onChange={(_, option) => setAlimento(option.data ?? null)}
            />
            <QuantityStepper value={quantidade} onChange={setQuantidade} unidadeGramas={alimento?.porcao_padrao_g ?? undefined} />
          </>
        )}

        {tipo === "receita" && (
          <p className="text-xs text-muted-light">
            As quantidades da receita são escaladas automaticamente pra completar o que falta da meta desta refeição.
          </p>
        )}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={fechar}>
            Cancelar
          </Button>
          <Button type="button" loading={saving} onClick={handleAdd}>
            Adicionar
          </Button>
        </div>
      </div>
    </Modal>
  );
}
