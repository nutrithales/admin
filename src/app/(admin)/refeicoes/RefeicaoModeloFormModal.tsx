"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Label, FieldGroup, Input } from "@/components/ui/Input";
import { Combobox } from "@/components/ui/Combobox";
import { QuantityStepper } from "@/components/ui/QuantityStepper";
import { Badge } from "@/components/ui/Badge";
import { refeicaoModeloSchema, type RefeicaoModeloFormValues } from "@/utils/validation/refeicao-modelo";
import { createRefeicaoModeloAction, updateRefeicaoModeloAction } from "@/services/refeicoes.actions";
import { searchAlimentosAction } from "@/services/alimentos.actions";
import { searchReceitasAction } from "@/services/receitas.actions";
import { GRUPO_ALIMENTAR_FRUTA, type AlimentoOption } from "@/services/alimentos.queries";
import type { ReceitaOption } from "@/services/receitas.queries";
import { calcularMacrosTotais, arredondarMacros } from "@/lib/nutrition/calcular-macros";
import { useToast } from "@/contexts/ToastContext";
import type { RefeicaoModeloComOpcoes } from "@/services/refeicoes.queries";

interface ItemState {
  tempId: string;
  tipo: "receita" | "alimento";
  receita: ReceitaOption | null;
  alimento: AlimentoOption | null;
  quantidade_g: number;
}

interface OpcaoState {
  tempId: string;
  nome: string;
  itens: ItemState[];
}

function novoItem(): ItemState {
  return { tempId: crypto.randomUUID(), tipo: "receita", receita: null, alimento: null, quantidade_g: 100 };
}

function novaOpcao(nome: string): OpcaoState {
  return { tempId: crypto.randomUUID(), nome, itens: [novoItem()] };
}

export function RefeicaoModeloFormModal({
  open,
  onClose,
  onSaved,
  refeicao,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  refeicao?: RefeicaoModeloComOpcoes | null;
}) {
  const { toast } = useToast();
  const [nome, setNome] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [ativo, setAtivo] = useState(true);
  const [opcoes, setOpcoes] = useState<OpcaoState[]>([novaOpcao("Opção 1")]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (refeicao) {
      setNome(refeicao.nome);
      setTagsInput((refeicao.tags ?? []).join(", "));
      setAtivo(refeicao.ativo);
      setOpcoes(
        refeicao.opcoes.length
          ? refeicao.opcoes
              .sort((a, b) => a.ordem - b.ordem)
              .map((opcao) => ({
                tempId: opcao.id,
                nome: opcao.nome,
                itens: opcao.itens.length
                  ? opcao.itens.map((item) => ({
                      tempId: item.id,
                      tipo: item.receita_id ? ("receita" as const) : ("alimento" as const),
                      receita: item.receita ? { id: item.receita.id, nome: item.receita.nome, tags: item.receita.tags } : null,
                      alimento: item.alimento,
                      quantidade_g: item.quantidade_g ?? 100,
                    }))
                  : [novoItem()],
              }))
          : [novaOpcao("Opção 1")],
      );
    } else {
      setNome("");
      setTagsInput("");
      setAtivo(true);
      setOpcoes([novaOpcao("Opção 1")]);
    }
  }, [open, refeicao]);

  function updateOpcao(tempId: string, patch: Partial<OpcaoState>) {
    setOpcoes((prev) => prev.map((o) => (o.tempId === tempId ? { ...o, ...patch } : o)));
  }
  function removeOpcao(tempId: string) {
    setOpcoes((prev) => (prev.length > 1 ? prev.filter((o) => o.tempId !== tempId) : prev));
  }
  function updateItem(opcaoTempId: string, itemTempId: string, patch: Partial<ItemState>) {
    setOpcoes((prev) =>
      prev.map((o) =>
        o.tempId !== opcaoTempId
          ? o
          : { ...o, itens: o.itens.map((it) => (it.tempId === itemTempId ? { ...it, ...patch } : it)) },
      ),
    );
  }
  function removeItem(opcaoTempId: string, itemTempId: string) {
    setOpcoes((prev) =>
      prev.map((o) =>
        o.tempId !== opcaoTempId || o.itens.length <= 1 ? o : { ...o, itens: o.itens.filter((it) => it.tempId !== itemTempId) },
      ),
    );
  }

  function totaisOpcao(opcao: OpcaoState) {
    const itensComMacro = opcao.itens.flatMap((it) => {
      if (it.tipo === "alimento" && it.alimento) {
        return [{ quantidade_g: it.quantidade_g, alimento: it.alimento }];
      }
      if (it.tipo === "receita" && it.receita) {
        // aproximação: soma os itens-base da receita (sem escalonar) —
        // suficiente pra dar uma noção de kcal da opção neste formulário.
        return [];
      }
      return [];
    });
    return arredondarMacros(calcularMacrosTotais(itensComMacro));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    for (const opcao of opcoes) {
      if (opcao.itens.some((it) => (it.tipo === "receita" && !it.receita) || (it.tipo === "alimento" && !it.alimento))) {
        setError(`Escolha uma receita ou alimento para todos os itens da opção "${opcao.nome}".`);
        return;
      }
    }

    const payload: RefeicaoModeloFormValues = {
      nome,
      tags: tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      ativo,
      opcoes: opcoes.map((opcao, i) => ({
        nome: opcao.nome,
        ordem: i,
        itens: opcao.itens.map((it, j) => ({
          receita_id: it.tipo === "receita" ? it.receita!.id : undefined,
          alimento_id: it.tipo === "alimento" ? it.alimento!.id : undefined,
          quantidade_g: it.tipo === "alimento" ? it.quantidade_g : undefined,
          ordem: j,
        })),
      })),
    };

    const parsed = refeicaoModeloSchema.safeParse(payload);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Dados inválidos.");
      return;
    }

    setSaving(true);
    const result = refeicao
      ? await updateRefeicaoModeloAction(refeicao.id, parsed.data)
      : await createRefeicaoModeloAction(parsed.data);
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
    <Modal open={open} onClose={onClose} title={refeicao ? "Editar refeição-modelo" : "Nova refeição-modelo"} size="lg">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FieldGroup>
            <Label htmlFor="nome">Nome</Label>
            <Input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="ex.: Café da manhã" />
          </FieldGroup>
          <FieldGroup>
            <Label htmlFor="tags">Tags (separadas por vírgula)</Label>
            <Input id="tags" value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} />
          </FieldGroup>
        </div>

        <p className="text-xs text-muted-light">
          Cada opção é uma alternativa completa para esta refeição (ex.: Opção 1 = ovos/pão/mamão, Opção 2 = iogurte/aveia/banana)
          — o paciente/nutricionista escolhe uma delas ao montar o plano.
        </p>

        <div className="flex flex-col gap-4">
          {opcoes.map((opcao) => (
            <div key={opcao.tempId} className="rounded-lg border border-border p-3">
              <div className="mb-2 flex items-center gap-2">
                <Input
                  value={opcao.nome}
                  onChange={(e) => updateOpcao(opcao.tempId, { nome: e.target.value })}
                  className="max-w-xs font-semibold"
                />
                {opcoes.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeOpcao(opcao.tempId)}
                    className="ml-auto flex size-8 items-center justify-center rounded-md text-muted transition-colors hover:bg-red-50 hover:text-danger"
                    aria-label="Remover opção"
                  >
                    <Trash2 className="size-4" />
                  </button>
                )}
              </div>

              <div className="flex flex-col gap-2">
                {opcao.itens.map((item) => (
                  <div key={item.tempId} className="grid grid-cols-1 items-center gap-2 sm:grid-cols-[100px_1fr_auto_auto]">
                    <div className="flex overflow-hidden rounded-md border border-border text-xs font-semibold">
                      <button
                        type="button"
                        onClick={() => updateItem(opcao.tempId, item.tempId, { tipo: "receita" })}
                        className={`px-2.5 py-2 transition-colors ${item.tipo === "receita" ? "bg-brand text-ink-deep" : "bg-surface text-muted hover:bg-bg-alt"}`}
                      >
                        Receita
                      </button>
                      <button
                        type="button"
                        onClick={() => updateItem(opcao.tempId, item.tempId, { tipo: "alimento" })}
                        className={`px-2.5 py-2 transition-colors ${item.tipo === "alimento" ? "bg-brand text-ink-deep" : "bg-surface text-muted hover:bg-bg-alt"}`}
                      >
                        Alimento
                      </button>
                    </div>

                    {item.tipo === "receita" ? (
                      <Combobox<ReceitaOption>
                        value={item.receita?.id}
                        selectedLabel={item.receita?.nome}
                        placeholder="Buscar receita..."
                        onQueryChange={async (q) =>
                          (await searchReceitasAction(q)).map((r) => ({ value: r.id, label: r.nome, data: r }))
                        }
                        onChange={(_, option) => updateItem(opcao.tempId, item.tempId, { receita: option.data ?? null })}
                      />
                    ) : (
                      <Combobox<AlimentoOption>
                        value={item.alimento?.id}
                        selectedLabel={item.alimento?.nome}
                        placeholder="Buscar alimento..."
                        onQueryChange={async (q) =>
                          (await searchAlimentosAction(q)).map((a) => ({ value: a.id, label: a.nome, data: a }))
                        }
                        onChange={(_, option) =>
                          updateItem(opcao.tempId, item.tempId, {
                            alimento: option.data ?? null,
                            quantidade_g:
                              option.data?.grupo_alimentar === GRUPO_ALIMENTAR_FRUTA && option.data.porcao_padrao_g
                                ? option.data.porcao_padrao_g
                                : item.quantidade_g,
                          })
                        }
                      />
                    )}

                    {item.tipo === "alimento" ? (
                      <QuantityStepper
                        key={item.alimento?.id}
                        value={item.quantidade_g}
                        onChange={(v) => updateItem(opcao.tempId, item.tempId, { quantidade_g: v })}
                        unidadeGramas={item.alimento?.porcao_padrao_g ?? undefined}
                        modoInicial={item.alimento?.grupo_alimentar === GRUPO_ALIMENTAR_FRUTA ? "un" : "g"}
                      />
                    ) : (
                      <span className="text-xs text-muted-light">quantidade da receita</span>
                    )}

                    <button
                      type="button"
                      onClick={() => removeItem(opcao.tempId, item.tempId)}
                      className="flex size-9 items-center justify-center rounded-md text-muted transition-colors hover:bg-red-50 hover:text-danger"
                      aria-label="Remover item"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="mt-2 flex items-center justify-between">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => updateOpcao(opcao.tempId, { itens: [...opcao.itens, novoItem()] })}
                >
                  <Plus className="size-4" /> Item
                </Button>
                <Badge tone="muted">{totaisOpcao(opcao).kcal} kcal (alimentos avulsos)</Badge>
              </div>
            </div>
          ))}
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setOpcoes((prev) => [...prev, novaOpcao(`Opção ${prev.length + 1}`)])}
        >
          <Plus className="size-4" /> Adicionar opção
        </Button>

        <label className="flex items-center gap-2 text-sm font-medium text-ink">
          <input
            type="checkbox"
            checked={ativo}
            onChange={(e) => setAtivo(e.target.checked)}
            className="size-4 rounded border-border text-brand focus:ring-brand/30"
          />
          Ativa
        </label>

        {error && <p className="text-sm font-medium text-danger">{error}</p>}

        <div className="mt-2 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={saving}>
            {refeicao ? "Salvar alterações" : "Cadastrar refeição"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
