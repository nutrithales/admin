"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, X } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Label, FieldGroup, Input } from "@/components/ui/Input";
import { Combobox } from "@/components/ui/Combobox";
import { Badge } from "@/components/ui/Badge";
import { protocoloSchema, type ProtocoloFormValues } from "@/utils/validation/protocolo";
import { createProtocoloAction, updateProtocoloAction } from "@/services/protocolos.actions";
import { searchReceitasAction } from "@/services/receitas.actions";
import { searchRefeicoesModeloAction } from "@/services/refeicoes.actions";
import type { ReceitaOption } from "@/services/receitas.queries";
import type { RefeicaoModeloOption } from "@/services/refeicoes.queries";
import { useToast } from "@/contexts/ToastContext";
import type { ProtocoloComDetalhes } from "@/services/protocolos.queries";

interface RefeicaoState {
  tempId: string;
  nome: string;
  horario_sugerido: string;
  percentual_kcal: string;
  preferidas: RefeicaoModeloOption[];
}

function novaRefeicao(nome: string): RefeicaoState {
  return { tempId: crypto.randomUUID(), nome, horario_sugerido: "", percentual_kcal: "", preferidas: [] };
}

function ChipPicker<T extends { id: string; nome: string }>({
  items,
  onAdd,
  onRemove,
  onQueryChange,
  placeholder,
}: {
  items: T[];
  onAdd: (item: T) => void;
  onRemove: (id: string) => void;
  onQueryChange: (query: string) => Promise<T[]>;
  placeholder: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Combobox<T>
        placeholder={placeholder}
        onQueryChange={async (q) => (await onQueryChange(q)).map((item) => ({ value: item.id, label: item.nome, data: item }))}
        onChange={(_, option) => option.data && onAdd(option.data)}
      />
      {items.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {items.map((item) => (
            <span key={item.id} className="inline-flex items-center gap-1 rounded-full bg-brand-light px-3 py-1 text-xs font-semibold text-brand-dark">
              {item.nome}
              <button type="button" onClick={() => onRemove(item.id)} aria-label={`Remover ${item.nome}`}>
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export function ProtocoloFormModal({
  open,
  onClose,
  onSaved,
  protocolo,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  protocolo?: ProtocoloComDetalhes | null;
}) {
  const { toast } = useToast();
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [ativo, setAtivo] = useState(true);
  const [refeicoes, setRefeicoes] = useState<RefeicaoState[]>([novaRefeicao("Café da manhã")]);
  const [receitasPreferidas, setReceitasPreferidas] = useState<ReceitaOption[]>([]);
  const [regraMacro, setRegraMacro] = useState({
    proteina_g_por_kg_min: "",
    proteina_g_por_kg_max: "",
    gordura_percentual_kcal_min: "",
    gordura_percentual_kcal_max: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (protocolo) {
      setNome(protocolo.nome);
      setDescricao(protocolo.descricao ?? "");
      setAtivo(protocolo.ativo);
      setRefeicoes(
        protocolo.refeicoes.length
          ? protocolo.refeicoes
              .sort((a, b) => a.ordem - b.ordem)
              .map((r) => ({
                tempId: r.id,
                nome: r.nome,
                horario_sugerido: r.horario_sugerido ?? "",
                percentual_kcal: r.percentual_kcal?.toString() ?? "",
                preferidas: r.preferidas.map((p) => p.refeicao_modelo).filter((rm): rm is RefeicaoModeloOption => !!rm) as RefeicaoModeloOption[],
              }))
          : [novaRefeicao("Café da manhã")],
      );
      setReceitasPreferidas(
        protocolo.receitas_preferidas.map((p) => p.receita).filter((r): r is ReceitaOption => !!r) as ReceitaOption[],
      );
      const regra = protocolo.regra_macro[0];
      setRegraMacro({
        proteina_g_por_kg_min: regra?.proteina_g_por_kg_min?.toString() ?? "",
        proteina_g_por_kg_max: regra?.proteina_g_por_kg_max?.toString() ?? "",
        gordura_percentual_kcal_min: regra?.gordura_percentual_kcal_min?.toString() ?? "",
        gordura_percentual_kcal_max: regra?.gordura_percentual_kcal_max?.toString() ?? "",
      });
    } else {
      setNome("");
      setDescricao("");
      setAtivo(true);
      setRefeicoes([novaRefeicao("Café da manhã")]);
      setReceitasPreferidas([]);
      setRegraMacro({ proteina_g_por_kg_min: "", proteina_g_por_kg_max: "", gordura_percentual_kcal_min: "", gordura_percentual_kcal_max: "" });
    }
  }, [open, protocolo]);

  function updateRefeicao(tempId: string, patch: Partial<RefeicaoState>) {
    setRefeicoes((prev) => prev.map((r) => (r.tempId === tempId ? { ...r, ...patch } : r)));
  }
  function removeRefeicao(tempId: string) {
    setRefeicoes((prev) => (prev.length > 1 ? prev.filter((r) => r.tempId !== tempId) : prev));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const hasRegraMacro = Object.values(regraMacro).some((v) => v !== "");

    const payload: ProtocoloFormValues = {
      nome,
      descricao,
      ativo,
      refeicoes: refeicoes.map((r, i) => ({
        nome: r.nome,
        ordem: i,
        horario_sugerido: r.horario_sugerido,
        percentual_kcal: r.percentual_kcal === "" ? undefined : Number(r.percentual_kcal),
        refeicoes_modelo_ids: r.preferidas.map((p) => p.id),
      })),
      receitas_preferidas_ids: receitasPreferidas.map((r) => r.id),
      regra_macro: hasRegraMacro
        ? {
            proteina_g_por_kg_min: regraMacro.proteina_g_por_kg_min === "" ? undefined : Number(regraMacro.proteina_g_por_kg_min),
            proteina_g_por_kg_max: regraMacro.proteina_g_por_kg_max === "" ? undefined : Number(regraMacro.proteina_g_por_kg_max),
            gordura_percentual_kcal_min:
              regraMacro.gordura_percentual_kcal_min === "" ? undefined : Number(regraMacro.gordura_percentual_kcal_min),
            gordura_percentual_kcal_max:
              regraMacro.gordura_percentual_kcal_max === "" ? undefined : Number(regraMacro.gordura_percentual_kcal_max),
          }
        : undefined,
    };

    const parsed = protocoloSchema.safeParse(payload);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Dados inválidos.");
      return;
    }

    setSaving(true);
    const result = protocolo
      ? await updateProtocoloAction(protocolo.id, parsed.data)
      : await createProtocoloAction(parsed.data);
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
    <Modal open={open} onClose={onClose} title={protocolo ? "Editar protocolo" : "Novo protocolo"} size="lg">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FieldGroup>
            <Label htmlFor="nome">Nome</Label>
            <Input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="ex.: Metodologia NTR — Hipertrofia" />
          </FieldGroup>
          <FieldGroup>
            <Label htmlFor="descricao">Descrição</Label>
            <Input id="descricao" value={descricao} onChange={(e) => setDescricao(e.target.value)} />
          </FieldGroup>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold text-ink">Horários de refeição e prioridades</p>
            <Button type="button" variant="ghost" size="sm" onClick={() => setRefeicoes((prev) => [...prev, novaRefeicao(`Refeição ${prev.length + 1}`)])}>
              <Plus className="size-4" /> Horário
            </Button>
          </div>
          <div className="flex flex-col gap-3">
            {refeicoes.map((r) => (
              <div key={r.tempId} className="rounded-lg border border-border p-3">
                <div className="mb-2 grid grid-cols-1 items-center gap-2 sm:grid-cols-[1fr_120px_110px_auto]">
                  <Input value={r.nome} onChange={(e) => updateRefeicao(r.tempId, { nome: e.target.value })} placeholder="Nome do horário" />
                  <Input
                    type="time"
                    value={r.horario_sugerido}
                    onChange={(e) => updateRefeicao(r.tempId, { horario_sugerido: e.target.value })}
                  />
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    placeholder="% kcal"
                    value={r.percentual_kcal}
                    onChange={(e) => updateRefeicao(r.tempId, { percentual_kcal: e.target.value })}
                  />
                  {refeicoes.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeRefeicao(r.tempId)}
                      className="flex size-9 items-center justify-center rounded-md text-muted transition-colors hover:bg-red-50 hover:text-danger"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  )}
                </div>
                <Label>Refeições-modelo priorizadas neste horário</Label>
                <ChipPicker
                  items={r.preferidas}
                  onAdd={(item) =>
                    updateRefeicao(r.tempId, { preferidas: r.preferidas.some((p) => p.id === item.id) ? r.preferidas : [...r.preferidas, item] })
                  }
                  onRemove={(id) => updateRefeicao(r.tempId, { preferidas: r.preferidas.filter((p) => p.id !== id) })}
                  onQueryChange={searchRefeicoesModeloAction}
                  placeholder="Buscar refeição-modelo..."
                />
              </div>
            ))}
          </div>
        </div>

        <FieldGroup>
          <Label>Receitas priorizadas pelo protocolo (geral)</Label>
          <ChipPicker
            items={receitasPreferidas}
            onAdd={(item) => setReceitasPreferidas((prev) => (prev.some((p) => p.id === item.id) ? prev : [...prev, item]))}
            onRemove={(id) => setReceitasPreferidas((prev) => prev.filter((p) => p.id !== id))}
            onQueryChange={searchReceitasAction}
            placeholder="Buscar receita..."
          />
        </FieldGroup>

        <div>
          <p className="mb-2 text-sm font-semibold text-ink">Faixas de macro (opcional)</p>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <FieldGroup>
              <Label>Proteína g/kg (mín)</Label>
              <Input
                type="number"
                step="0.1"
                value={regraMacro.proteina_g_por_kg_min}
                onChange={(e) => setRegraMacro((p) => ({ ...p, proteina_g_por_kg_min: e.target.value }))}
              />
            </FieldGroup>
            <FieldGroup>
              <Label>Proteína g/kg (máx)</Label>
              <Input
                type="number"
                step="0.1"
                value={regraMacro.proteina_g_por_kg_max}
                onChange={(e) => setRegraMacro((p) => ({ ...p, proteina_g_por_kg_max: e.target.value }))}
              />
            </FieldGroup>
            <FieldGroup>
              <Label>Gordura % kcal (mín)</Label>
              <Input
                type="number"
                value={regraMacro.gordura_percentual_kcal_min}
                onChange={(e) => setRegraMacro((p) => ({ ...p, gordura_percentual_kcal_min: e.target.value }))}
              />
            </FieldGroup>
            <FieldGroup>
              <Label>Gordura % kcal (máx)</Label>
              <Input
                type="number"
                value={regraMacro.gordura_percentual_kcal_max}
                onChange={(e) => setRegraMacro((p) => ({ ...p, gordura_percentual_kcal_max: e.target.value }))}
              />
            </FieldGroup>
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm font-medium text-ink">
          <input type="checkbox" checked={ativo} onChange={(e) => setAtivo(e.target.checked)} className="size-4 rounded border-border text-brand focus:ring-brand/30" />
          Ativo
        </label>

        {error && <p className="text-sm font-medium text-danger">{error}</p>}

        <div className="mt-2 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={saving}>
            {protocolo ? "Salvar alterações" : "Cadastrar protocolo"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
