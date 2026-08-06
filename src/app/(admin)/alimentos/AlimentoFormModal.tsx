"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, Sparkles } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Label, FieldGroup, Input, Textarea } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import {
  alimentoSchema,
  TAGS_RESTRICAO_SUGERIDAS,
  type AlimentoFormValues,
  type MedidaCaseira,
} from "@/utils/validation/alimento";
import { createAlimentoAction, updateAlimentoAction, buscarAlimentoComIAAction } from "@/services/alimentos.actions";
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
  fibra_100g: undefined,
  acucares_100g: undefined,
  sodio_100g: undefined,
  calcio_100g: undefined,
  ferro_100g: undefined,
  potassio_100g: undefined,
  magnesio_100g: undefined,
  vitamina_a_100g: undefined,
  vitamina_c_100g: undefined,
  indice_glicemico: undefined,
  carga_glicemica: undefined,
  fator_coccao: undefined,
  fator_correcao: undefined,
  porcao_padrao_g: undefined,
  unidade_padrao: "",
  medidas_caseiras: [],
  categoria: "",
  grupo_alimentar: "",
  tags_restricao: [],
  marca: "",
  ingredientes: "",
  alergenos: [],
  observacoes: "",
  ativo: true,
};

function numberField(
  values: AlimentoFormValues,
  setField: <K extends keyof AlimentoFormValues>(key: K, value: AlimentoFormValues[K]) => void,
  key: keyof AlimentoFormValues,
  label: string,
) {
  const value = values[key] as number | undefined;
  return (
    <FieldGroup key={key}>
      <Label htmlFor={key}>{label}</Label>
      <Input
        id={key}
        type="number"
        step="0.1"
        value={value ?? ""}
        onChange={(e) => setField(key, (e.target.value === "" ? undefined : Number(e.target.value)) as never)}
      />
    </FieldGroup>
  );
}

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
  const [alergenosInput, setAlergenosInput] = useState("");
  const [medidas, setMedidas] = useState<(MedidaCaseira & { tempId: string })[]>([]);
  const [errors, setErrors] = useState<Partial<Record<keyof AlimentoFormValues, string>>>({});
  const [saving, setSaving] = useState(false);
  const [buscandoIA, setBuscandoIA] = useState(false);

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
        fibra_100g: alimento.fibra_100g ?? undefined,
        acucares_100g: alimento.acucares_100g ?? undefined,
        sodio_100g: alimento.sodio_100g ?? undefined,
        calcio_100g: alimento.calcio_100g ?? undefined,
        ferro_100g: alimento.ferro_100g ?? undefined,
        potassio_100g: alimento.potassio_100g ?? undefined,
        magnesio_100g: alimento.magnesio_100g ?? undefined,
        vitamina_a_100g: alimento.vitamina_a_100g ?? undefined,
        vitamina_c_100g: alimento.vitamina_c_100g ?? undefined,
        indice_glicemico: alimento.indice_glicemico ?? undefined,
        carga_glicemica: alimento.carga_glicemica ?? undefined,
        fator_coccao: alimento.fator_coccao ?? undefined,
        fator_correcao: alimento.fator_correcao ?? undefined,
        porcao_padrao_g: alimento.porcao_padrao_g ?? undefined,
        unidade_padrao: alimento.unidade_padrao ?? "",
        medidas_caseiras: Array.isArray(alimento.medidas_caseiras) ? (alimento.medidas_caseiras as MedidaCaseira[]) : [],
        categoria: alimento.categoria ?? "",
        grupo_alimentar: alimento.grupo_alimentar ?? "",
        tags_restricao: alimento.tags_restricao ?? [],
        marca: alimento.marca ?? "",
        ingredientes: alimento.ingredientes ?? "",
        alergenos: alimento.alergenos ?? [],
        observacoes: alimento.observacoes ?? "",
        ativo: alimento.ativo,
      });
      setTagsInput((alimento.tags_restricao ?? []).join(", "));
      setAlergenosInput((alimento.alergenos ?? []).join(", "));
      const medidasExistentes = Array.isArray(alimento.medidas_caseiras) ? (alimento.medidas_caseiras as MedidaCaseira[]) : [];
      setMedidas(medidasExistentes.map((m) => ({ ...m, tempId: crypto.randomUUID() })));
    } else {
      setValues(emptyForm);
      setTagsInput("");
      setAlergenosInput("");
      setMedidas([]);
    }
  }, [open, alimento]);

  function setField<K extends keyof AlimentoFormValues>(key: K, value: AlimentoFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function addMedida() {
    setMedidas((prev) => [...prev, { tempId: crypto.randomUUID(), unidade: "", peso_g: 0 }]);
  }

  function updateMedida(tempId: string, patch: Partial<MedidaCaseira>) {
    setMedidas((prev) => prev.map((m) => (m.tempId === tempId ? { ...m, ...patch } : m)));
  }

  function removeMedida(tempId: string) {
    setMedidas((prev) => prev.filter((m) => m.tempId !== tempId));
  }

  async function handleBuscarIA() {
    if (!values.nome.trim()) {
      toast({ kind: "error", title: "Digite o nome do alimento primeiro." });
      return;
    }
    setBuscandoIA(true);
    const result = await buscarAlimentoComIAAction(values.nome);
    setBuscandoIA(false);

    if (!result.success || !result.estimativa) {
      toast({ kind: "error", title: "Não foi possível buscar com IA", description: result.message });
      return;
    }

    const e = result.estimativa;
    setValues((prev) => ({
      ...prev,
      categoria: e.categoria ?? prev.categoria,
      grupo_alimentar: e.grupo_alimentar ?? prev.grupo_alimentar,
      kcal_100g: e.kcal_100g,
      proteina_100g: e.proteina_100g,
      carboidrato_100g: e.carboidrato_100g,
      gordura_100g: e.gordura_100g,
      fibra_100g: e.fibra_100g ?? undefined,
      porcao_padrao_g: e.porcao_padrao_g ?? undefined,
      unidade_padrao: e.unidade_padrao ?? prev.unidade_padrao,
      origem: "web",
      observacoes: e.observacoes,
    }));
    toast({ kind: "success", title: result.message });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload: AlimentoFormValues = {
      ...values,
      tags_restricao: tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      alergenos: alergenosInput
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      medidas_caseiras: medidas.map(({ unidade, peso_g }) => ({ unidade, peso_g })),
    };
    const parsed = alimentoSchema.safeParse(payload);
    if (!parsed.success) {
      const fieldErrors: typeof errors = {};
      for (const issue of parsed.error.issues) {
        fieldErrors[issue.path[0] as keyof AlimentoFormValues] = issue.message;
      }
      setErrors(fieldErrors);
      toast({ kind: "error", title: parsed.error.issues[0]?.message ?? "Dados inválidos." });
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

  const isFabricante = values.origem === "fabricante";

  return (
    <Modal open={open} onClose={onClose} title={alimento ? "Editar alimento" : "Novo alimento"} size="lg">
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FieldGroup className="sm:col-span-2">
            <Label htmlFor="nome">Nome</Label>
            <div className="flex gap-2">
              <Input id="nome" value={values.nome} onChange={(e) => setField("nome", e.target.value)} error={errors.nome} className="flex-1" />
              {!alimento && (
                <Button type="button" variant="outline" loading={buscandoIA} onClick={handleBuscarIA}>
                  <Sparkles className="size-4" /> Buscar com IA
                </Button>
              )}
            </div>
            {!alimento && (
              <p className="mt-1.5 text-xs text-muted-light">
                Não achou o alimento na base? Digite o nome e deixe a IA estimar a composição — sempre revise antes de salvar.
              </p>
            )}
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

        <div>
          <p className="mb-2 text-sm font-semibold text-ink">Composição nutricional (por 100g)</p>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {numberField(values, setField, "kcal_100g", "Kcal")}
            {numberField(values, setField, "proteina_100g", "Proteína (g)")}
            {numberField(values, setField, "carboidrato_100g", "Carboidrato (g)")}
            {numberField(values, setField, "gordura_100g", "Gordura (g)")}
            {numberField(values, setField, "fibra_100g", "Fibra (g)")}
            {numberField(values, setField, "acucares_100g", "Açúcares (g)")}
            {numberField(values, setField, "sodio_100g", "Sódio (mg)")}
            {numberField(values, setField, "calcio_100g", "Cálcio (mg)")}
            {numberField(values, setField, "ferro_100g", "Ferro (mg)")}
            {numberField(values, setField, "potassio_100g", "Potássio (mg)")}
            {numberField(values, setField, "magnesio_100g", "Magnésio (mg)")}
            {numberField(values, setField, "vitamina_a_100g", "Vitamina A (mcg)")}
            {numberField(values, setField, "vitamina_c_100g", "Vitamina C (mg)")}
            {numberField(values, setField, "indice_glicemico", "Índice glicêmico")}
            {numberField(values, setField, "carga_glicemica", "Carga glicêmica")}
          </div>
          <p className="mt-2 text-xs text-muted-light">
            Só calorias/proteína/carboidrato/gordura são obrigatórios — o resto pode ficar em branco quando a fonte não tiver o dado.
          </p>
        </div>

        <div>
          <p className="mb-2 text-sm font-semibold text-ink">Fatores de preparo</p>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {numberField(values, setField, "fator_coccao", "Fator de cocção")}
            {numberField(values, setField, "fator_correcao", "Fator de correção")}
          </div>
        </div>

        <div>
          <p className="mb-2 text-sm font-semibold text-ink">Medidas caseiras</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FieldGroup>
              <Label htmlFor="porcao_padrao_g">Peso da porção padrão (g)</Label>
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
              <Label htmlFor="unidade_padrao">Nome da porção padrão</Label>
              <Input
                id="unidade_padrao"
                placeholder="ex.: unidade, fatia, colher de sopa"
                value={values.unidade_padrao}
                onChange={(e) => setField("unidade_padrao", e.target.value)}
              />
            </FieldGroup>
          </div>

          {medidas.length > 0 && (
            <div className="mt-3 flex flex-col gap-2">
              {medidas.map((m) => (
                <div key={m.tempId} className="grid grid-cols-[1fr_140px_auto] gap-2">
                  <Input
                    placeholder="ex.: xícara, colher de sopa"
                    value={m.unidade}
                    onChange={(e) => updateMedida(m.tempId, { unidade: e.target.value })}
                  />
                  <Input
                    type="number"
                    step="0.1"
                    placeholder="peso em g"
                    value={m.peso_g || ""}
                    onChange={(e) => updateMedida(m.tempId, { peso_g: Number(e.target.value) })}
                  />
                  <button
                    type="button"
                    onClick={() => removeMedida(m.tempId)}
                    className="flex size-9 items-center justify-center rounded-md text-muted transition-colors hover:bg-red-50 hover:text-danger"
                    aria-label="Remover medida"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <Button type="button" variant="ghost" size="sm" className="mt-2" onClick={addMedida}>
            <Plus className="size-4" /> Adicionar outra medida caseira
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FieldGroup>
            <Label htmlFor="categoria">Categoria</Label>
            <Input
              id="categoria"
              placeholder="ex.: proteína animal, cereal..."
              value={values.categoria}
              onChange={(e) => setField("categoria", e.target.value)}
            />
          </FieldGroup>
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
          </FieldGroup>
        </div>
        <p className="-mt-2 text-xs text-muted-light">
          Alimentos do grupo &quot;fruta&quot; entram nas telas de montagem sempre por porção (1, 2, 3...), não em gramas.
        </p>

        <FieldGroup>
          <Label htmlFor="tags_restricao">Restrições/tags (separadas por vírgula)</Label>
          <Input
            id="tags_restricao"
            list="tags-restricao-sugeridas"
            placeholder="ex.: contem_lactose, contem_gluten, vegetariano_ok"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
          />
          <datalist id="tags-restricao-sugeridas">
            {TAGS_RESTRICAO_SUGERIDAS.map((t) => (
              <option key={t} value={t} />
            ))}
          </datalist>
        </FieldGroup>

        <div className="rounded-lg border border-border p-4">
          <p className="mb-3 text-sm font-semibold text-ink">
            Produto industrializado {isFabricante && <span className="font-normal text-muted-light">(recomendado preencher)</span>}
          </p>
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FieldGroup>
                <Label htmlFor="marca">Marca</Label>
                <Input id="marca" placeholder="ex.: Growth, Piracanjuba..." value={values.marca} onChange={(e) => setField("marca", e.target.value)} />
              </FieldGroup>
              <FieldGroup>
                <Label htmlFor="alergenos">Alérgenos (separados por vírgula)</Label>
                <Input
                  id="alergenos"
                  placeholder="ex.: contém soja, contém amendoim"
                  value={alergenosInput}
                  onChange={(e) => setAlergenosInput(e.target.value)}
                />
              </FieldGroup>
            </div>
            <FieldGroup>
              <Label htmlFor="ingredientes">Ingredientes (como no rótulo)</Label>
              <Textarea id="ingredientes" value={values.ingredientes} onChange={(e) => setField("ingredientes", e.target.value)} />
            </FieldGroup>
          </div>
        </div>

        <FieldGroup>
          <Label htmlFor="observacoes">Observações</Label>
          <Textarea id="observacoes" value={values.observacoes} onChange={(e) => setField("observacoes", e.target.value)} />
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
