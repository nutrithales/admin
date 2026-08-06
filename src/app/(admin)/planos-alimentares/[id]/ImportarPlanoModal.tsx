"use client";

import { useRef, useState } from "react";
import { Upload, FileText, AlertTriangle } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Textarea, Label, FieldGroup } from "@/components/ui/Input";
import { importarPlanoAction } from "@/services/planos-estruturados.actions";
import { useToast } from "@/contexts/ToastContext";

export function ImportarPlanoModal({
  open,
  onClose,
  onImportado,
  planoId,
}: {
  open: boolean;
  onClose: () => void;
  onImportado: () => void;
  planoId: string;
}) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [modo, setModo] = useState<"pdf" | "texto">("pdf");
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [texto, setTexto] = useState("");
  const [importando, setImportando] = useState(false);
  const [naoEncontrados, setNaoEncontrados] = useState<string[] | null>(null);

  function fechar() {
    setModo("pdf");
    setArquivo(null);
    setTexto("");
    setNaoEncontrados(null);
    onClose();
  }

  async function handleImportar() {
    if (modo === "pdf" && !arquivo) {
      toast({ kind: "error", title: "Selecione um arquivo PDF." });
      return;
    }
    if (modo === "texto" && !texto.trim()) {
      toast({ kind: "error", title: "Cole o texto do plano." });
      return;
    }

    const formData = new FormData();
    if (modo === "pdf" && arquivo) formData.set("arquivo", arquivo);
    if (modo === "texto") formData.set("texto", texto);

    setImportando(true);
    const result = await importarPlanoAction(planoId, formData);
    setImportando(false);

    if (result.success) {
      toast({ kind: "success", title: result.message });
      onImportado();
      if (!result.naoEncontrados?.length) {
        fechar();
      } else {
        setNaoEncontrados(result.naoEncontrados);
      }
    } else {
      toast({ kind: "error", title: "Não foi possível importar", description: result.message });
      if (result.naoEncontrados?.length) setNaoEncontrados(result.naoEncontrados);
    }
  }

  return (
    <Modal
      open={open}
      onClose={fechar}
      title="Importar plano existente"
      description="Envie o PDF de um plano pronto (de outro sistema, ex.: WebDiet) ou cole o texto. A IA converte pro padrão deste sistema, usando só as quantidades já escritas no documento e alimentos já cadastrados na biblioteca."
      size="lg"
    >
      <div className="flex flex-col gap-4">
        <div className="flex w-fit overflow-hidden rounded-md border border-border text-sm font-semibold">
          <button
            type="button"
            onClick={() => setModo("pdf")}
            className={`px-4 py-2 transition-colors ${modo === "pdf" ? "bg-brand text-ink-deep" : "bg-surface text-muted hover:bg-bg-alt"}`}
          >
            PDF
          </button>
          <button
            type="button"
            onClick={() => setModo("texto")}
            className={`px-4 py-2 transition-colors ${modo === "texto" ? "bg-brand text-ink-deep" : "bg-surface text-muted hover:bg-bg-alt"}`}
          >
            Colar texto
          </button>
        </div>

        {modo === "pdf" ? (
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={(e) => setArquivo(e.target.files?.[0] ?? null)}
            />
            <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
              <Upload className="size-4" /> {arquivo ? "Trocar arquivo" : "Selecionar PDF"}
            </Button>
            {arquivo && (
              <p className="mt-2 flex items-center gap-1.5 text-sm text-ink">
                <FileText className="size-4 text-brand-dark" /> {arquivo.name}
              </p>
            )}
          </div>
        ) : (
          <FieldGroup>
            <Label htmlFor="texto-plano">Texto do plano</Label>
            <Textarea
              id="texto-plano"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="Cole aqui o conteúdo do plano (refeições, alimentos e quantidades)..."
              rows={10}
            />
          </FieldGroup>
        )}

        {naoEncontrados && naoEncontrados.length > 0 && (
          <div className="rounded-lg border border-warning/30 bg-warning/10 p-3">
            <p className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-ink">
              <AlertTriangle className="size-4 text-warning" /> Itens não reconhecidos na biblioteca
            </p>
            <p className="mb-2 text-xs text-muted-light">
              Não entraram no plano. Cadastre esses alimentos (ou use &quot;Buscar com IA&quot; em Alimentos) e adicione manualmente na refeição.
            </p>
            <ul className="flex flex-col gap-0.5 text-sm text-ink">
              {naoEncontrados.map((item, i) => (
                <li key={i}>• {item}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={fechar}>
            {naoEncontrados ? "Fechar" : "Cancelar"}
          </Button>
          {!naoEncontrados && (
            <Button type="button" loading={importando} onClick={handleImportar}>
              Importar
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
