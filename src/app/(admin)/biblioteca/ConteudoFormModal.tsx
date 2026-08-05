"use client";

import { useEffect, useRef, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Label, FieldGroup, Textarea } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { saveConteudoBibliotecaAction } from "@/services/biblioteca.actions";
import { useToast } from "@/contexts/ToastContext";
import type { Tables } from "@/types/database.types";

const fileInputClasses =
  "block w-full text-sm text-muted file:mr-4 file:rounded-full file:border-0 file:bg-brand file:px-4 file:py-2 file:text-sm file:font-semibold file:text-ink-deep hover:file:bg-brand-dark hover:file:text-white file:cursor-pointer cursor-pointer";

export function ConteudoFormModal({
  open,
  onClose,
  onSaved,
  conteudo,
  categoriasSugeridas,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  conteudo?: Tables<"biblioteca"> | null;
  categoriasSugeridas: string[];
}) {
  const { toast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  const [tipo, setTipo] = useState<string>("pdf");
  const [ativo, setAtivo] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setTipo(conteudo?.tipo ?? "pdf");
      setAtivo(conteudo?.ativo ?? true);
    }
  }, [open, conteudo]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!formRef.current) return;
    const formData = new FormData(formRef.current);
    formData.set("ativo", ativo ? "1" : "0");

    setSaving(true);
    const result = await saveConteudoBibliotecaAction(conteudo?.id ?? null, formData);
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
    <Modal
      open={open}
      onClose={onClose}
      title={conteudo ? "Editar conteúdo" : "Novo conteúdo"}
      description="Disponível para pacientes autenticados quando ativo."
    >
      <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-4">
        <FieldGroup>
          <Label htmlFor="titulo">Título</Label>
          <Input id="titulo" name="titulo" required defaultValue={conteudo?.titulo ?? ""} />
        </FieldGroup>

        <FieldGroup>
          <Label htmlFor="descricao">Descrição</Label>
          <Textarea id="descricao" name="descricao" defaultValue={conteudo?.descricao ?? ""} />
        </FieldGroup>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FieldGroup>
            <Label htmlFor="categoria">Categoria</Label>
            <Input
              id="categoria"
              name="categoria"
              list="categorias-biblioteca"
              defaultValue={conteudo?.categoria ?? ""}
              placeholder="Nutrição esportiva"
            />
            <datalist id="categorias-biblioteca">
              {categoriasSugeridas.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </FieldGroup>
          <FieldGroup>
            <Label htmlFor="tipo">Tipo</Label>
            <Select id="tipo" name="tipo" value={tipo} onChange={(e) => setTipo(e.target.value)}>
              <option value="pdf">PDF</option>
              <option value="video">Vídeo</option>
              <option value="link">Link externo</option>
              <option value="html">HTML (em breve)</option>
            </Select>
          </FieldGroup>
        </div>

        {(tipo === "pdf" || tipo === "video") && (
          <FieldGroup>
            <Label htmlFor="arquivo">
              Arquivo {tipo === "pdf" ? "PDF" : "de vídeo"} {conteudo && "(opcional — mantém o atual se vazio)"}
            </Label>
            <input
              id="arquivo"
              name="arquivo"
              type="file"
              accept={tipo === "pdf" ? "application/pdf" : "video/*"}
              className={fileInputClasses}
            />
          </FieldGroup>
        )}

        {tipo === "link" && (
          <FieldGroup>
            <Label htmlFor="url">URL</Label>
            <Input id="url" name="url" type="url" defaultValue={conteudo?.url ?? ""} placeholder="https://..." />
          </FieldGroup>
        )}

        {tipo === "html" && (
          <p className="rounded-md bg-bg-alt-2 px-3.5 py-2.5 text-sm text-muted">
            Suporte a conteúdo HTML será disponibilizado em uma atualização futura.
          </p>
        )}

        <FieldGroup>
          <Label htmlFor="thumbnail">Thumbnail (opcional)</Label>
          <input id="thumbnail" name="thumbnail" type="file" accept="image/*" className={fileInputClasses} />
        </FieldGroup>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FieldGroup>
            <Label htmlFor="ordem">Ordem</Label>
            <Input id="ordem" name="ordem" type="number" min={0} defaultValue={conteudo?.ordem ?? 0} />
          </FieldGroup>
          <FieldGroup>
            <Label htmlFor="ativo-select">Status</Label>
            <Select
              id="ativo-select"
              value={ativo ? "1" : "0"}
              onChange={(e) => setAtivo(e.target.value === "1")}
            >
              <option value="1">Ativo</option>
              <option value="0">Inativo</option>
            </Select>
          </FieldGroup>
        </div>

        <div className="mt-2 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={saving}>
            {conteudo ? "Salvar alterações" : "Adicionar conteúdo"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
