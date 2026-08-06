"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, ChefHat, Apple, Repeat, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input, Label, FieldGroup, Textarea } from "@/components/ui/Input";
import { DragList } from "@/components/ui/DragList";
import { MacroSummary } from "@/components/ui/MacroSummary";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/contexts/ToastContext";
import { calcularMacrosTotais, arredondarMacros } from "@/lib/nutrition/calcular-macros";
import {
  removerItemDoPlanoAction,
  reordenarItensAction,
  updateMetaRefeicaoAction,
  substituirItemAvulsoAction,
  substituirIngredienteAction,
} from "@/services/planos-estruturados.actions";
import type { PlanoRefeicaoComItens, PlanoItemComDados, IngredienteComAlimento } from "@/services/planos-estruturados.queries";
import { AddItemModal } from "./AddItemModal";
import { SubstituirModal } from "./SubstituirModal";
import { MontarTextoLivreModal } from "./MontarTextoLivreModal";

export function macrosDoItem(item: PlanoItemComDados) {
  if (item.alimento && item.quantidade_g) {
    return calcularMacrosTotais([{ quantidade_g: item.quantidade_g, alimento: item.alimento }]);
  }
  return calcularMacrosTotais(item.ingredientes.map((ing) => ({ quantidade_g: ing.quantidade_g_final, alimento: ing.alimento })));
}

export function macrosDaRefeicao(refeicao: PlanoRefeicaoComItens) {
  return refeicao.itens.reduce(
    (acc, item) => {
      const m = macrosDoItem(item);
      return {
        kcal: acc.kcal + m.kcal,
        proteina_g: acc.proteina_g + m.proteina_g,
        carboidrato_g: acc.carboidrato_g + m.carboidrato_g,
        gordura_g: acc.gordura_g + m.gordura_g,
      };
    },
    { kcal: 0, proteina_g: 0, carboidrato_g: 0, gordura_g: 0 },
  );
}

interface AlvoSubstituicao {
  tipo: "item" | "ingrediente";
  id: string;
  alimentoId: string;
  nome: string;
  quantidadeG: number;
}

function ItemRow({
  item,
  editavel,
  onRemove,
  onSubstituirItem,
  onSubstituirIngrediente,
}: {
  item: PlanoItemComDados;
  editavel: boolean;
  onRemove: () => void;
  onSubstituirItem: () => void;
  onSubstituirIngrediente: (ing: IngredienteComAlimento) => void;
}) {
  const macros = arredondarMacros(macrosDoItem(item));

  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          {item.receita ? <ChefHat className="size-4 shrink-0 text-brand-dark" /> : <Apple className="size-4 shrink-0 text-brand-dark" />}
          <p className="truncate font-semibold text-ink">{item.receita?.nome ?? item.alimento?.nome}</p>
        </div>
        {item.receita ? (
          <ul className="mt-1.5 flex flex-col gap-0.5 text-xs text-muted">
            {item.ingredientes.map((ing) => (
              <li key={ing.id} className="flex items-center gap-1.5">
                <span>
                  {ing.alimento.nome} — {Math.round(ing.quantidade_g_final)}g
                </span>
                {editavel && (
                  <button
                    type="button"
                    onClick={() => onSubstituirIngrediente(ing)}
                    className="text-muted-light transition-colors hover:text-brand-dark"
                    aria-label={`Substituir ${ing.alimento.nome}`}
                    title="Substituir ingrediente"
                  >
                    <Repeat className="size-3" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-1 text-xs text-muted">{item.quantidade_g}g</p>
        )}
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          <Badge tone="muted">{macros.kcal} kcal</Badge>
          <Badge tone="muted">{macros.proteina_g}g P</Badge>
          <Badge tone="muted">{macros.carboidrato_g}g C</Badge>
          <Badge tone="muted">{macros.gordura_g}g G</Badge>
        </div>
      </div>
      {editavel && (
        <div className="flex shrink-0 items-center gap-1">
          {item.alimento && (
            <button
              type="button"
              onClick={onSubstituirItem}
              className="flex size-8 items-center justify-center rounded-md text-muted transition-colors hover:bg-bg-alt hover:text-brand-dark"
              aria-label="Substituir alimento"
              title="Substituir"
            >
              <Repeat className="size-4" />
            </button>
          )}
          <button
            type="button"
            onClick={onRemove}
            className="flex size-8 items-center justify-center rounded-md text-muted transition-colors hover:bg-red-50 hover:text-danger"
            aria-label="Remover item"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      )}
    </div>
  );
}

export function RefeicaoTab({ refeicao, planoId, editavel }: { refeicao: PlanoRefeicaoComItens; planoId: string; editavel: boolean }) {
  const router = useRouter();
  const { toast } = useToast();
  const [addOpen, setAddOpen] = useState(false);
  const [textoLivreOpen, setTextoLivreOpen] = useState(false);
  const [editandoMeta, setEditandoMeta] = useState(false);
  const [metaKcal, setMetaKcal] = useState(refeicao.meta_kcal?.toString() ?? "");
  const [metaProteina, setMetaProteina] = useState(refeicao.meta_proteina_g?.toString() ?? "");
  const [metaCarboidrato, setMetaCarboidrato] = useState(refeicao.meta_carboidrato_g?.toString() ?? "");
  const [metaGordura, setMetaGordura] = useState(refeicao.meta_gordura_g?.toString() ?? "");
  const [observacoes, setObservacoes] = useState(refeicao.observacoes ?? "");
  const [savingMeta, setSavingMeta] = useState(false);
  const [savingObservacoes, setSavingObservacoes] = useState(false);
  const [alvoSubstituicao, setAlvoSubstituicao] = useState<AlvoSubstituicao | null>(null);

  // "Montar por texto (IA)" escreve a observação direto no servidor; sem
  // isso, o textarea (que só lê o valor inicial do estado local) ficaria
  // mostrando o texto antigo até trocar de aba e voltar.
  useEffect(() => setObservacoes(refeicao.observacoes ?? ""), [refeicao.observacoes]);

  function refresh() {
    router.refresh();
  }

  const itensOrdenados = [...refeicao.itens].sort((a, b) => a.ordem - b.ordem);
  const realizado = arredondarMacros(macrosDaRefeicao(refeicao));

  async function handleRemove(itemId: string) {
    const result = await removerItemDoPlanoAction(itemId, planoId);
    toast({ kind: result.success ? "success" : "error", title: result.message });
    if (result.success) refresh();
  }

  async function handleReorder(itens: PlanoItemComDados[]) {
    const result = await reordenarItensAction(
      planoId,
      itens.map((i) => i.id),
    );
    if (result.success) refresh();
  }

  async function handleSalvarMeta() {
    setSavingMeta(true);
    const result = await updateMetaRefeicaoAction(refeicao.id, planoId, {
      meta_kcal: metaKcal ? Number(metaKcal) : undefined,
      meta_proteina_g: metaProteina ? Number(metaProteina) : undefined,
      meta_carboidrato_g: metaCarboidrato ? Number(metaCarboidrato) : undefined,
      meta_gordura_g: metaGordura ? Number(metaGordura) : undefined,
      observacoes: observacoes || undefined,
    });
    setSavingMeta(false);
    toast({ kind: result.success ? "success" : "error", title: result.message });
    if (result.success) {
      setEditandoMeta(false);
      refresh();
    }
  }

  async function handleSalvarObservacoes() {
    setSavingObservacoes(true);
    const result = await updateMetaRefeicaoAction(refeicao.id, planoId, {
      meta_kcal: metaKcal ? Number(metaKcal) : undefined,
      meta_proteina_g: metaProteina ? Number(metaProteina) : undefined,
      meta_carboidrato_g: metaCarboidrato ? Number(metaCarboidrato) : undefined,
      meta_gordura_g: metaGordura ? Number(metaGordura) : undefined,
      observacoes: observacoes || undefined,
    });
    setSavingObservacoes(false);
    toast({ kind: result.success ? "success" : "error", title: result.message });
    if (result.success) refresh();
  }

  async function handleConfirmarSubstituicao(novoAlimentoId: string) {
    if (!alvoSubstituicao) return;
    const result =
      alvoSubstituicao.tipo === "item"
        ? await substituirItemAvulsoAction(alvoSubstituicao.id, planoId, novoAlimentoId)
        : await substituirIngredienteAction(alvoSubstituicao.id, planoId, novoAlimentoId);
    toast({ kind: result.success ? "success" : "error", title: result.message });
    if (result.success) {
      setAlvoSubstituicao(null);
      refresh();
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 rounded-lg border border-border bg-bg-alt-2 p-3 sm:flex-row sm:items-center sm:justify-between">
        <MacroSummary
          compact
          realizado={realizado}
          meta={{
            kcal: refeicao.meta_kcal ?? undefined,
            proteina_g: refeicao.meta_proteina_g ?? undefined,
            carboidrato_g: refeicao.meta_carboidrato_g ?? undefined,
            gordura_g: refeicao.meta_gordura_g ?? undefined,
          }}
          className="flex-1"
        />
        {editavel && (
          <Button type="button" variant="ghost" size="sm" onClick={() => setEditandoMeta((v) => !v)}>
            {editandoMeta ? "Fechar" : "Editar meta"}
          </Button>
        )}
      </div>

      <FieldGroup>
        <Label htmlFor={`observacoes-${refeicao.id}`}>Observações desta refeição</Label>
        <Textarea
          id={`observacoes-${refeicao.id}`}
          value={observacoes}
          onChange={(e) => setObservacoes(e.target.value)}
          disabled={!editavel}
          placeholder="Dicas de preparo, substituições sugeridas, notas para deixar o plano mais premium — aparece no PDF, só nesta refeição."
        />
        {editavel && (
          <Button type="button" size="sm" variant="outline" loading={savingObservacoes} onClick={handleSalvarObservacoes} className="w-fit">
            Salvar observações
          </Button>
        )}
      </FieldGroup>

      {editandoMeta && (
        <div className="grid grid-cols-2 gap-3 rounded-lg border border-border p-3 sm:grid-cols-4">
          <FieldGroup>
            <Label>Kcal</Label>
            <Input type="number" value={metaKcal} onChange={(e) => setMetaKcal(e.target.value)} />
          </FieldGroup>
          <FieldGroup>
            <Label>Proteína (g)</Label>
            <Input type="number" value={metaProteina} onChange={(e) => setMetaProteina(e.target.value)} />
          </FieldGroup>
          <FieldGroup>
            <Label>Carboidrato (g)</Label>
            <Input type="number" value={metaCarboidrato} onChange={(e) => setMetaCarboidrato(e.target.value)} />
          </FieldGroup>
          <FieldGroup>
            <Label>Gordura (g)</Label>
            <Input type="number" value={metaGordura} onChange={(e) => setMetaGordura(e.target.value)} />
          </FieldGroup>
          <div className="col-span-2 flex items-end sm:col-span-4">
            <Button type="button" size="sm" loading={savingMeta} onClick={handleSalvarMeta}>
              Salvar meta
            </Button>
          </div>
        </div>
      )}

      {itensOrdenados.length === 0 ? (
        <EmptyState icon={ChefHat} title="Nenhum item nesta refeição" description="Adicione uma receita ou um alimento avulso." />
      ) : (
        <DragList
          items={itensOrdenados}
          keyFor={(i) => i.id}
          onReorder={editavel ? handleReorder : () => {}}
          renderItem={(item) => (
            <ItemRow
              item={item}
              editavel={editavel}
              onRemove={() => handleRemove(item.id)}
              onSubstituirItem={() =>
                item.alimento &&
                setAlvoSubstituicao({
                  tipo: "item",
                  id: item.id,
                  alimentoId: item.alimento.id,
                  nome: item.alimento.nome,
                  quantidadeG: item.quantidade_g ?? 0,
                })
              }
              onSubstituirIngrediente={(ing) =>
                setAlvoSubstituicao({
                  tipo: "ingrediente",
                  id: ing.id,
                  alimentoId: ing.alimento.id,
                  nome: ing.alimento.nome,
                  quantidadeG: ing.quantidade_g_final,
                })
              }
            />
          )}
        />
      )}

      {editavel && (
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => setAddOpen(true)} className="w-fit">
            <Plus className="size-4" /> Adicionar receita ou alimento
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => setTextoLivreOpen(true)} className="w-fit">
            <Sparkles className="size-4" /> Montar por texto (IA)
          </Button>
        </div>
      )}

      <AddItemModal open={addOpen} onClose={() => setAddOpen(false)} onAdded={refresh} planoRefeicaoId={refeicao.id} planoId={planoId} />

      <MontarTextoLivreModal
        open={textoLivreOpen}
        onClose={() => setTextoLivreOpen(false)}
        onMontado={refresh}
        planoRefeicaoId={refeicao.id}
        planoId={planoId}
        nomeRefeicao={refeicao.nome}
      />

      {alvoSubstituicao && (
        <SubstituirModal
          open={!!alvoSubstituicao}
          onClose={() => setAlvoSubstituicao(null)}
          alimentoId={alvoSubstituicao.alimentoId}
          alimentoNome={alvoSubstituicao.nome}
          quantidadeG={alvoSubstituicao.quantidadeG}
          onConfirm={handleConfirmarSubstituicao}
        />
      )}
    </div>
  );
}
