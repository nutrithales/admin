"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Label, FieldGroup, Input, Textarea } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Combobox } from "@/components/ui/Combobox";
import { QuantityStepper } from "@/components/ui/QuantityStepper";
import { Badge } from "@/components/ui/Badge";
import { receitaSchema, PAPEL_MACRO, type ReceitaFormValues } from "@/utils/validation/receita";
import { createReceitaAction, updateReceitaAction } from "@/services/receitas.actions";
import { searchAlimentosAction } from "@/services/alimentos.actions";
import { GRUPO_ALIMENTAR_FRUTA, type AlimentoOption } from "@/services/alimentos.queries";
import { calcularMacrosTotais, arredondarMacros } from "@/lib/nutrition/calcular-macros";
import { useToast } from "@/contexts/ToastContext";
import type { ReceitaComItens } from "@/services/receitas.queries";

const papelLabel: Record<(typeof PAPEL_MACRO)[number], string> = {
  proteina: "Proteína",
  carboidrato: "Carboidrato",
  gordura: "Gordura",
  livre: "Livre (não escala)",
};

interface ItemState {
  tempId: string;
  alimento: AlimentoOption | null;
  quantidade_base_g: number;
  papel_macro: (typeof PAPEL_MACRO)[number];
  componente: string;
}

function novoItem(): ItemState {
  return { tempId: crypto.randomUUID(), alimento: null, quantidade_base_g: 100, papel_macro: "livre", componente: "" };
}

export function ReceitaFormModal({
  open,
  onClose,
  onSaved,
  receita,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  receita?: ReceitaComItens | null;
}) {
  const { toast } = useToast();
  const [nome, setNome] = useState("");
  const [modoPreparo, setModoPreparo] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [ativo, setAtivo] = useState(true);
  const [itens, setItens] = useState<ItemState[]>([novoItem()]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (receita) {
      setNome(receita.nome);
      setModoPreparo(receita.modo_preparo ?? "");
      setTagsInput((receita.tags ?? []).join(", "));
      setAtivo(receita.ativo);
      setItens(
        receita.itens.length
          ? receita.itens
              .sort((a, b) => a.ordem - b.ordem)
              .map((item) => ({
                tempId: item.id,
                alimento: item.alimento,
                quantidade_base_g: item.quantidade_base_g,
                papel_macro: (item.papel_macro as (typeof PAPEL_MACRO)[number]) ?? "livre",
                componente: item.componente ?? "",
              }))
          : [novoItem()],
      );
    } else {
      setNome("");
      setModoPreparo("");
      setTagsInput("");
      setAtivo(true);
      setItens([novoItem()]);
    }
  }, [open, receita]);

  function updateItem(tempId: string, patch: Partial<ItemState>) {
    setItens((prev) => prev.map((it) => (it.tempId === tempId ? { ...it, ...patch } : it)));
  }

  function removeItem(tempId: string) {
    setItens((prev) => (prev.length > 1 ? prev.filter((it) => it.tempId !== tempId) : prev));
  }

  const totais = arredondarMacros(
    calcularMacrosTotais(
      itens
        .filter((it): it is ItemState & { alimento: AlimentoOption } => !!it.alimento)
        .map((it) => ({ quantidade_g: it.quantidade_base_g, alimento: it.alimento })),
    ),
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (itens.some((it) => !it.alimento)) {
      setError("Escolha um alimento para todos os itens (ou remova a linha).");
      return;
    }

    const payload: ReceitaFormValues = {
      nome,
      modo_preparo: modoPreparo,
      tags: tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      ativo,
      itens: itens.map((it, i) => ({
        alimento_id: it.alimento!.id,
        quantidade_base_g: it.quantidade_base_g,
        papel_macro: it.papel_macro,
        componente: it.componente,
        ordem: i,
      })),
    };

    const parsed = receitaSchema.safeParse(payload);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Dados inválidos.");
      return;
    }

    setSaving(true);
    const result = receita
      ? await updateReceitaAction(receita.id, parsed.data)
      : await createReceitaAction(parsed.data);
    setSaving(false);

    if (result.success) {
      toast({ kind: "success", title: result.message });
      onSaved();
      onClose();
    } else {
      toast({ kind: "error", title: "Não foi possível salvar", description: result.message });
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={receita ? "Editar receita" : "Nova receita"} size="lg">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <FieldGroup>
          <Label htmlFor="nome">Nome</Label>
          <Input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="ex.: Panqueca Proteica" />
        </FieldGroup>

        <FieldGroup>
          <Label htmlFor="tags">Tags (separadas por vírgula)</Label>
          <Input
            id="tags"
            placeholder="ex.: café-da-manhã, vegetariano"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
          />
        </FieldGroup>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold text-ink">Ingredientes</p>
            <Button type="button" variant="ghost" size="sm" onClick={() => setItens((prev) => [...prev, novoItem()])}>
              <Plus className="size-4" /> Adicionar ingrediente
            </Button>
          </div>

          <div className="flex flex-col gap-3">
            {itens.map((item) => (
              <div key={item.tempId} className="grid grid-cols-1 items-start gap-2 rounded-lg border border-border p-3 sm:grid-cols-[1fr_auto_auto_1fr_auto]">
                <Combobox<AlimentoOption>
                  value={item.alimento?.id}
                  selectedLabel={item.alimento?.nome}
                  placeholder="Buscar alimento..."
                  onQueryChange={async (q) =>
                    (await searchAlimentosAction(q)).map((a) => ({
                      value: a.id,
                      label: a.nome,
                      description: `${a.kcal_100g} kcal · ${a.proteina_100g}P/${a.carboidrato_100g}C/${a.gordura_100g}G por 100g`,
                      data: a,
                    }))
                  }
                  onChange={(_, option) =>
                    updateItem(item.tempId, {
                      alimento: option.data ?? null,
                      quantidade_base_g:
                        option.data?.grupo_alimentar === GRUPO_ALIMENTAR_FRUTA && option.data.porcao_padrao_g
                          ? option.data.porcao_padrao_g
                          : item.quantidade_base_g,
                    })
                  }
                />
                <QuantityStepper
                  key={item.alimento?.id}
                  value={item.quantidade_base_g}
                  onChange={(v) => updateItem(item.tempId, { quantidade_base_g: v })}
                  unidadeGramas={item.alimento?.porcao_padrao_g ?? undefined}
                  modoInicial={item.alimento?.grupo_alimentar === GRUPO_ALIMENTAR_FRUTA ? "un" : "g"}
                />
                <Select
                  value={item.papel_macro}
                  onChange={(e) => updateItem(item.tempId, { papel_macro: e.target.value as (typeof PAPEL_MACRO)[number] })}
                >
                  {PAPEL_MACRO.map((p) => (
                    <option key={p} value={p}>
                      {papelLabel[p]}
                    </option>
                  ))}
                </Select>
                <Input
                  placeholder="Componente (opcional, ex.: Proteína)"
                  value={item.componente}
                  onChange={(e) => updateItem(item.tempId, { componente: e.target.value })}
                />
                <button
                  type="button"
                  onClick={() => removeItem(item.tempId)}
                  className="flex size-9 items-center justify-center self-center rounded-md text-muted transition-colors hover:bg-red-50 hover:text-danger"
                  aria-label="Remover ingrediente"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 rounded-lg bg-bg-alt-2 p-3">
          <span className="text-sm font-semibold text-ink">Total:</span>
          <Badge tone="brand">{totais.kcal} kcal</Badge>
          <Badge tone="muted">{totais.proteina_g}g proteína</Badge>
          <Badge tone="muted">{totais.carboidrato_g}g carboidrato</Badge>
          <Badge tone="muted">{totais.gordura_g}g gordura</Badge>
        </div>

        <FieldGroup>
          <Label htmlFor="modo_preparo">Modo de preparo</Label>
          <Textarea id="modo_preparo" value={modoPreparo} onChange={(e) => setModoPreparo(e.target.value)} />
        </FieldGroup>

        <label className="flex items-center gap-2 text-sm font-medium text-ink">
          <input
            type="checkbox"
            checked={ativo}
            onChange={(e) => setAtivo(e.target.checked)}
            className="size-4 rounded border-border text-brand focus:ring-brand/30"
          />
          Ativa (disponível para uso em refeições/planos)
        </label>

        {error && <p className="text-sm font-medium text-danger">{error}</p>}

        <div className="mt-2 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={saving}>
            {receita ? "Salvar alterações" : "Cadastrar receita"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
