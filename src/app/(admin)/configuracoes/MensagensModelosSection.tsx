"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label, FieldGroup, Textarea } from "@/components/ui/Input";
import { useToast } from "@/contexts/ToastContext";
import { updateMensagemModeloAction } from "@/services/mensagens.actions";
import type { Tables } from "@/types/database.types";

const PLACEHOLDERS = "{{primeiro_nome}}, {{data}}, {{horario}}, {{tipo_consulta}}, {{local_ou_link}}, {{plano}}, {{consultas_realizadas}}, {{consultas_restantes}}";

export function MensagensModelosSection({ modelos }: { modelos: Tables<"mensagens_modelos">[] }) {
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Modelos de mensagem (Clara)</CardTitle>
          <CardDescription>
            Textos usados pela Clara para preparar mensagens. Placeholders disponíveis: {PLACEHOLDERS}. A Clara nunca
            envia essas mensagens sozinha — só preenche para revisão e cópia.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {modelos.map((modelo) => (
          <ModeloRow key={modelo.id} modelo={modelo} />
        ))}
      </CardContent>
    </Card>
  );
}

function ModeloRow({ modelo }: { modelo: Tables<"mensagens_modelos"> }) {
  const router = useRouter();
  const { toast } = useToast();
  const [titulo, setTitulo] = useState(modelo.titulo);
  const [corpo, setCorpo] = useState(modelo.corpo);
  const [saving, setSaving] = useState(false);

  async function salvar() {
    setSaving(true);
    const result = await updateMensagemModeloAction(modelo.id, { titulo, corpo, ativo: modelo.ativo });
    setSaving(false);
    toast({ kind: result.success ? "success" : "error", title: result.message });
    if (result.success) router.refresh();
  }

  return (
    <details className="rounded-lg border border-border p-4">
      <summary className="cursor-pointer text-sm font-semibold text-ink">{titulo}</summary>
      <div className="mt-3 flex flex-col gap-3">
        <FieldGroup>
          <Label htmlFor={`titulo-${modelo.id}`}>Título</Label>
          <Input id={`titulo-${modelo.id}`} value={titulo} onChange={(e) => setTitulo(e.target.value)} />
        </FieldGroup>
        <FieldGroup>
          <Label htmlFor={`corpo-${modelo.id}`}>Texto</Label>
          <Textarea id={`corpo-${modelo.id}`} value={corpo} onChange={(e) => setCorpo(e.target.value)} className="min-h-24" />
        </FieldGroup>
        <Button size="sm" className="self-end" onClick={salvar} loading={saving}>
          Salvar modelo
        </Button>
      </div>
    </details>
  );
}
