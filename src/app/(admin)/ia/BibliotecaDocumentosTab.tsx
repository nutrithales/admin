"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Upload, FileText, AlertTriangle, BookOpen, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Select";
import { Label, FieldGroup, Textarea } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/contexts/ToastContext";
import { importarDocumentoBibliotecaAction } from "@/services/biblioteca-ia.actions";
import type { DocumentoBibliotecaComPaciente, PendentesRevisao } from "@/services/biblioteca-ia.queries";

const tipoLabel: Record<string, string> = {
  pdf: "PDF",
  docx: "Word",
  html: "HTML",
  txt: "Texto",
  imagem: "Imagem",
};

export function BibliotecaDocumentosTab({
  documentos,
  pendentes,
  pacientes,
}: {
  documentos: DocumentoBibliotecaComPaciente[];
  pendentes: PendentesRevisao;
  pacientes: { auth_id: string; nome: string }[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [modo, setModo] = useState<"arquivo" | "texto">("arquivo");
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [texto, setTexto] = useState("");
  const [authId, setAuthId] = useState("");
  const [importando, setImportando] = useState(false);

  function refresh() {
    router.refresh();
  }

  async function handleImportar() {
    if (modo === "arquivo" && !arquivo) {
      toast({ kind: "error", title: "Selecione um arquivo." });
      return;
    }
    if (modo === "texto" && !texto.trim()) {
      toast({ kind: "error", title: "Cole o texto do documento." });
      return;
    }

    const formData = new FormData();
    if (modo === "arquivo" && arquivo) formData.set("arquivo", arquivo);
    if (modo === "texto") formData.set("texto", texto);
    if (authId) formData.set("authId", authId);

    setImportando(true);
    const result = await importarDocumentoBibliotecaAction(formData);
    setImportando(false);

    toast({ kind: result.success ? "success" : "error", title: result.message });
    if (result.success) {
      setArquivo(null);
      setTexto("");
      refresh();
    }
  }

  const totalPendentes = pendentes.alimentos.length + pendentes.receitas.length;

  return (
    <div className="flex flex-col gap-6">
      <Card className="p-5">
        <div className="mb-3 flex items-center gap-2">
          <Sparkles className="size-4 text-brand-dark" />
          <p className="font-semibold text-ink">Importar documento pra biblioteca</p>
        </div>
        <p className="mb-4 text-sm text-muted-light">
          Envie um PDF, Word, HTML, TXT ou imagem (inclusive escaneada) de um plano, receita ou material nutricional. A IA
          reconhece alimentos, receitas, refeições e substituições, e cadastra tudo automaticamente na biblioteca (fica marcado
          como &quot;não revisado&quot; até você conferir).
        </p>

        <div className="mb-4 flex w-fit overflow-hidden rounded-md border border-border text-sm font-semibold">
          <button
            type="button"
            onClick={() => setModo("arquivo")}
            className={`px-4 py-2 transition-colors ${modo === "arquivo" ? "bg-brand text-ink-deep" : "bg-surface text-muted hover:bg-bg-alt"}`}
          >
            Arquivo
          </button>
          <button
            type="button"
            onClick={() => setModo("texto")}
            className={`px-4 py-2 transition-colors ${modo === "texto" ? "bg-brand text-ink-deep" : "bg-surface text-muted hover:bg-bg-alt"}`}
          >
            Colar texto
          </button>
        </div>

        {modo === "arquivo" ? (
          <div className="mb-4">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.html,.htm,.txt,.png,.jpg,.jpeg,.webp,.heic,.heif"
              className="hidden"
              onChange={(e) => setArquivo(e.target.files?.[0] ?? null)}
            />
            <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
              <Upload className="size-4" /> {arquivo ? "Trocar arquivo" : "Selecionar arquivo"}
            </Button>
            {arquivo && (
              <p className="mt-2 flex items-center gap-1.5 text-sm text-ink">
                <FileText className="size-4 text-brand-dark" /> {arquivo.name}
              </p>
            )}
          </div>
        ) : (
          <FieldGroup className="mb-4">
            <Label htmlFor="texto-doc">Texto do documento</Label>
            <Textarea id="texto-doc" value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Cole aqui o conteúdo..." rows={8} />
          </FieldGroup>
        )}

        <FieldGroup className="mb-4 max-w-sm">
          <Label htmlFor="paciente-doc">Ligar a um paciente (opcional)</Label>
          <Select id="paciente-doc" value={authId} onChange={(e) => setAuthId(e.target.value)}>
            <option value="">Nenhum (material de referência geral)</option>
            {pacientes.map((p) => (
              <option key={p.auth_id} value={p.auth_id}>
                {p.nome}
              </option>
            ))}
          </Select>
          <p className="mt-1.5 text-xs text-muted-light">
            Alimentos e receitas novos entram na biblioteca de qualquer forma. Ligar a um paciente só ajuda a rastrear a origem
            do documento; pra aplicar o conteúdo a um plano estruturado desse paciente, use &quot;Importar plano&quot; na tela do
            plano.
          </p>
        </FieldGroup>

        <Button type="button" loading={importando} onClick={handleImportar}>
          Importar e processar
        </Button>
      </Card>

      {totalPendentes > 0 && (
        <Card className="border-warning/30 bg-warning/10 p-5">
          <p className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-ink">
            <AlertTriangle className="size-4 text-warning" /> {totalPendentes} ite{totalPendentes > 1 ? "ns" : "m"} criado{totalPendentes > 1 ? "s" : ""} por IA aguardando revisão
          </p>
          <p className="mb-3 text-xs text-muted-light">Confira os valores antes de usar em planos com mais confiança.</p>
          <div className="flex flex-wrap gap-4 text-sm">
            {pendentes.alimentos.length > 0 && (
              <Link href="/alimentos" className="font-semibold text-brand-dark hover:underline">
                {pendentes.alimentos.length} alimento(s) em /alimentos →
              </Link>
            )}
            {pendentes.receitas.length > 0 && (
              <Link href="/receitas" className="font-semibold text-brand-dark hover:underline">
                {pendentes.receitas.length} receita(s) em /receitas →
              </Link>
            )}
          </div>
        </Card>
      )}

      <div>
        <p className="mb-3 flex items-center gap-1.5 font-semibold text-ink">
          <BookOpen className="size-4" /> Documentos importados
        </p>
        {documentos.length === 0 ? (
          <EmptyState icon={BookOpen} title="Nenhum documento importado ainda" description="O que você importar aparece aqui com um resumo do que foi reconhecido." />
        ) : (
          <div className="flex flex-col gap-3">
            {documentos.map((doc) => {
              const resumo = doc.resumo_extracao as Record<string, unknown> | null;
              return (
                <Card key={doc.id} className="p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <FileText className="size-4 shrink-0 text-brand-dark" />
                      <p className="font-semibold text-ink">{doc.nome_arquivo}</p>
                      <Badge tone="muted">{tipoLabel[doc.tipo_arquivo] ?? doc.tipo_arquivo}</Badge>
                      {doc.status === "erro" && <Badge tone="warning">Erro</Badge>}
                    </div>
                    <span className="text-xs text-muted-light">{new Date(doc.created_at).toLocaleString("pt-BR")}</span>
                  </div>
                  {doc.paciente_nome && <p className="mt-1 text-xs text-muted">Paciente: {doc.paciente_nome}</p>}
                  {doc.status === "erro" ? (
                    <p className="mt-2 text-sm text-danger">{doc.erro_mensagem}</p>
                  ) : (
                    resumo && (
                      <p className="mt-2 text-xs text-muted-light">
                        {[
                          typeof resumo.alimentosNovos === "number" && resumo.alimentosNovos > 0 ? `${resumo.alimentosNovos} alimento(s) novo(s)` : null,
                          typeof resumo.receitasNovas === "number" && resumo.receitasNovas > 0 ? `${resumo.receitasNovas} receita(s) nova(s)` : null,
                          typeof resumo.receitasAtualizadas === "number" && resumo.receitasAtualizadas > 0 ? `${resumo.receitasAtualizadas} receita(s) atualizada(s)` : null,
                          typeof resumo.refeicoesModeloNovas === "number" && resumo.refeicoesModeloNovas > 0 ? `${resumo.refeicoesModeloNovas} refeição(ões)-modelo nova(s)` : null,
                          typeof resumo.itensNaoReconhecidos === "number" && resumo.itensNaoReconhecidos > 0 ? `${resumo.itensNaoReconhecidos} item(ns) não reconhecido(s)` : null,
                        ]
                          .filter(Boolean)
                          .join(" · ") || "Nada de novo reconhecido."}
                      </p>
                    )
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
