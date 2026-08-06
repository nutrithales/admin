"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Label, FieldGroup, Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { alimentoSchema, type AlimentoFormValues } from "@/utils/validation/alimento";
import { createAlimentoAction, updateAlimentoAction } from "@/services/alimentos.actions";
import { useToast } from "@/contexts/ToastContext";
import type { Tables } from "@/types/database.types";

const ORIGENS = [
  { value: "tbca_7_3", label: "TBCA 7.3" },
  { value: "fabricante", label: "Dados de fabricante" },
  { value: "tucunduva", label: "Tucunduva" },
  { value: "usda", label: "USDA" },
  { value: "fao", label: "FAO" },
  { value: "web", label: "Fonte da internet" },
  { value: "manual", label: "Cadastro manual" },
] as const;

const GRUPOS_ALIMENTARES = [
  "fruta",
  "vegetal_a",
  "vegetal_b",
  "cereal",
  "tuberculo",
  "leguminosa",
  "proteina_animal",
  "laticinio",
  "gordura",
  "acucar_doce",
  "bebida",
  "suplemento",
] as const;

const emptyForm: AlimentoFormValues = {
  nome: "",
  origem: "manual",
  origem_referencia: "",
  kcal_100g: 0,
  proteina_100g: 0,
  carboidrato_100g: 0,
  gordura_100g: 0,
  porcao_padrao_g: undefined,
  categoria: "",
  grupo_alimentar: "",
  tags_restricao: [],
  ativo: true,
};

export function AlimentoFormModal({
  open,
  onClose,
  onSaved,
  alimento,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  alimento?: Tables<"alimentos"> | null;
}) {
  const { toast } = useToast();
  const [values, setValues] = useState<AlimentoFormValues>(emptyForm);
  const [tagsInput, setTagsInput] = useState("");
  const [errors, setErrors] = useState<Partial<Record<keyof AlimentoFormValues, string>>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setErrors({});
    if (alimento) {
      setValues({
        nome: alimento.nome,
        origem: alimento.origem,
        origem_referencia: alimento.origem_referencia ?? "",
        kcal_100g: alimento.kcal_100g,
        proteina_100g: alimento.proteina_100g,
        carboidrato_100g: alimento.carboidrato_100g,
        gordura_100g: alimento.gordura_100g,
        porcao_padrao_g: alimento.porcao_padrao_g ?? undefined,
        categoria: alimento.categoria ?? "",
        grupo_alimentar: alimento.grupo_alimentar ?? "",
        tags_restricao: alimento.tags_restricao ?? [],
        ativo: alimento.ativo,
      });
      setTagsInput((alimento.tags_restricao ?? []).join(", "));
    } else {
      setValues(emptyForm);
      setTagsInput("");
    }
  }, [open, alimento]);

  function setField<K extends keyof AlimentoFormValues>(key: K, value: AlimentoFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload: AlimentoFormValues = {
      ...values,
      tags_restricao: tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    };
    const parsed = alimentoSchema.safeParse(payload);
    if (!parsed.success) {
      const fieldErrors: typeof errors = {};
      for (const issue of parsed.error.issues) {
        fieldErrors[issue.path[0] as keyof AlimentoFormValues] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    setSaving(true);
    const result = alimento
      ? await updateAlimentoAction(alimento.id, parsed.data)
      : await createAlimentoAction(parsed.data);
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
    <Modal open={open} onClose={onClose} title={alimento ? "Editar alimento" : "Novo alimento"} size="lg">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FieldGroup className="sm:col-span-2">
            <Label htmlFor="nome">Nome</Label>
            <Input id="nome" value={values.nome} onChange={(e) => setField("nome", e.target.value)} error={errors.nome} />
          </FieldGroup>

          <FieldGroup>
            <Label htmlFor="origem">Fonte</Label>
            <Select id="origem" value={values.origem} onChange={(e) => setField("origem", e.target.value)}>
              {ORIGENS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </FieldGroup>
          <FieldGroup>
            <Label htmlFor="origem_referencia">Referência da fonte</Label>
            <Input
              id="origem_referencia"
              placeholder="URL, código do produto..."
              value={values.origem_referencia}
              onChange={(e) => setField("origem_referencia", e.target.value)}
            />
          </FieldGroup>
        </div>

        <p className="text-sm font-semibold text-ink">Composição nutricional (por 100g)</p>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <FieldGroup>
            <Label htmlFor="kcal_100g">Kcal</Label>
            <Input
              id="kcal_100g"
              type="number"
              step="0.1"
              value={values.kcal_100g}
              onChange={(e) => setField("kcal_100g", Number(e.target.value))}
              error={errors.kcal_100g}
            />
          </FieldGroup>
          <FieldGroup>
            <Label htmlFor="proteina_100g">Proteína (g)</Label>
            <Input
              id="proteina_100g"
              type="number"
              step="0.1"
              value={values.proteina_100g}
              onChange={(e) => setField("proteina_100g", Number(e.target.value))}
              error={errors.proteina_100g}
            />
          </FieldGroup>
          <FieldGroup>
            <Label htmlFor="carboidrato_100g">Carboidrato (g)</Label>
            <Input
              id="carboidrato_100g"
              type="number"
              step="0.1"
              value={values.carboidrato_100g}
              onChange={(e) => setField("carboidrato_100g", Number(e.target.value))}
              error={errors.carboidrato_100g}
            />
          </FieldGroup>
          <FieldGroup>
            <Label htmlFor="gordura_100g">Gordura (g)</Label>
            <Input
              id="gordura_100g"
              type="number"
              step="0.1"
              value={values.gordura_100g}
              onChange={(e) => setField("gordura_100g", Number(e.target.value))}
              error={errors.gordura_100g}
            />
          </FieldGroup>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FieldGroup>
            <Label htmlFor="porcao_padrao_g">Peso de 1 unidade/porção (g)</Label>
            <Input
              id="porcao_padrao_g"
              type="number"
              step="0.1"
              placeholder="ex.: 1 ovo = 50"
              value={values.porcao_padrao_g ?? ""}
              onChange={(e) => setField("porcao_padrao_g", e.target.value === "" ? undefined : Number(e.target.value))}
            />
          </FieldGroup>
          <FieldGroup>
            <Label htmlFor="categoria">Categoria</Label>
            <Input
              id="categoria"
              placeholder="ex.: proteína animal, cereal..."
              value={values.categoria}
              onChange={(e) => setField("categoria", e.target.value)}
            />
          </FieldGroup>
        </div>

        <FieldGroup>
          <Label htmlFor="grupo_alimentar">Grupo alimentar</Label>
          <Select id="grupo_alimentar" value={values.grupo_alimentar} onChange={(e) => setField("grupo_alimentar", e.target.value)}>
            <option value="">Sem grupo definido</option>
            {GRUPOS_ALIMENTARES.map((g) => (
              <option key={g} value={g}>
                {g.replace(/_/g, " ")}
              </option>
            ))}
          </Select>
          <p className="mt-1.5 text-xs text-muted-light">
            Alimentos do grupo &quot;fruta&quot; entram nas telas de montagem sempre por porção (1, 2, 3...), não em gramas.
          </p>
        </FieldGroup>

        <FieldGroup>
          <Label htmlFor="tags_restricao">Restrições/tags (separadas por vírgula)</Label>
          <Input
            id="tags_restricao"
            placeholder="ex.: contem_lactose, contem_gluten, vegetariano_ok"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
          />
        </FieldGroup>

        <label className="flex items-center gap-2 text-sm font-medium text-ink">
          <input
            type="checkbox"
            checked={values.ativo}
            onChange={(e) => setField("ativo", e.target.checked)}
            className="size-4 rounded border-border text-brand focus:ring-brand/30"
          />
          Ativo (disponível para uso em receitas)
        </label>

        <div className="mt-2 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={saving}>
            {alimento ? "Salvar alterações" : "Cadastrar alimento"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
