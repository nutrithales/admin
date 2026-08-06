"use client";

import { useState } from "react";
import { AlertTriangle, Sparkles } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Textarea, Label, FieldGroup } from "@/components/ui/Input";
import { montarRefeicaoTextoLivreAction } from "@/services/planos-estruturados.actions";
import { useToast } from "@/contexts/ToastContext";

export function MontarTextoLivreModal({
  open,
  onClose,
  onMontado,
  planoRefeicaoId,
  planoId,
  nomeRefeicao,
}: {
  open: boolean;
  onClose: () => void;
  onMontado: () => void;
  planoRefeicaoId: string;
  planoId: string;
  nomeRefeicao: string;
}) {
  const { toast } = useToast();
  const [texto, setTexto] = useState("");
  const [montando, setMontando] = useState(false);
  const [naoEncontrados, setNaoEncontrados] = useState<string[] | null>(null);

  function fechar() {
    setTexto("");
    setNaoEncontrados(null);
    onClose();
  }

  async function handleMontar() {
    if (!texto.trim()) {
      toast({ kind: "error", title: "Escreva os alimentos dessa refeição primeiro." });
      return;
    }

    setMontando(true);
    const result = await montarRefeicaoTextoLivreAction(planoRefeicaoId, planoId, texto);
    setMontando(false);

    for (const aviso of result.avisos ?? []) toast({ kind: "warning", title: aviso });

    if (result.success) {
      toast({ kind: "success", title: result.message });
      onMontado();
      if (!result.naoEncontrados?.length) {
        fechar();
      } else {
        setNaoEncontrados(result.naoEncontrados);
      }
    } else {
      toast({ kind: "error", title: "Não foi possível montar", description: result.message });
      if (result.naoEncontrados?.length) setNaoEncontrados(result.naoEncontrados);
    }
  }

  return (
    <Modal
      open={open}
      onClose={fechar}
      title={`Montar "${nomeRefeicao}" por texto livre`}
      description="Escreva os alimentos dessa refeição, sem se preocupar com quantidade. A IA reconhece cada um contra a biblioteca já cadastrada, calcula as gramas pra bater a meta do paciente (mesmo motor determinístico usado nas receitas) e escreve uma observação pra essa refeição."
      size="lg"
    >
      <div className="flex flex-col gap-4">
        <FieldGroup>
          <Label htmlFor="texto-livre-refeicao">Alimentos</Label>
          <Textarea
            id="texto-livre-refeicao"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="ex.: peito de frango, arroz branco, brócolis, azeite de oliva"
            rows={4}
          />
        </FieldGroup>

        {naoEncontrados && naoEncontrados.length > 0 && (
          <div className="rounded-lg border border-warning/30 bg-warning/10 p-3">
            <p className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-ink">
              <AlertTriangle className="size-4 text-warning" /> Não reconhecidos na biblioteca
            </p>
            <p className="mb-2 text-xs text-muted-light">
              Não entraram na refeição. Cadastre esses alimentos (ou use &quot;Buscar com IA&quot; em Alimentos) e adicione manualmente.
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
            <Button type="button" loading={montando} onClick={handleMontar}>
              <Sparkles className="size-4" /> Montar com IA
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
