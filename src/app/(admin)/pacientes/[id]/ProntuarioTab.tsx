"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Label, FieldGroup, Textarea } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { useToast } from "@/contexts/ToastContext";
import { upsertProntuarioAction } from "@/services/prontuarios.actions";
import type { ConsultaComProntuario } from "@/services/prontuarios.queries";

function ConsultaProntuario({
  consulta,
  pacienteId,
  onSaved,
}: {
  consulta: ConsultaComProntuario;
  pacienteId: string;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [prontuario, setProntuario] = useState(consulta.prontuario?.prontuario ?? "");
  const [resumoGranola, setResumoGranola] = useState(consulta.prontuario?.resumo_granola ?? "");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    const result = await upsertProntuarioAction(consulta.id, pacienteId, { prontuario, resumo_granola: resumoGranola });
    setSaving(false);
    toast({ kind: result.success ? "success" : "error", title: result.message });
    if (result.success) onSaved();
  }

  return (
    <div className="rounded-lg border border-border p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="font-semibold text-ink">
            {consulta.data ? new Date(consulta.data).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "Sem data"}
          </p>
          <p className="text-xs text-muted-light">{consulta.tipo === "online" ? "On-line" : "Presencial"}</p>
        </div>
        <Badge tone="muted">Visível só para você</Badge>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FieldGroup>
          <Label>Prontuário</Label>
          <Textarea value={prontuario} onChange={(e) => setProntuario(e.target.value)} placeholder="Anotações clínicas desta consulta..." />
        </FieldGroup>
        <FieldGroup>
          <Label>Resumo do Granola</Label>
          <Textarea
            value={resumoGranola}
            onChange={(e) => setResumoGranola(e.target.value)}
            placeholder="Cole aqui o resumo da conversa gerado pelo Granola..."
          />
        </FieldGroup>
      </div>

      <div className="mt-3 flex justify-end">
        <Button type="button" size="sm" loading={saving} onClick={handleSave}>
          Salvar
        </Button>
      </div>
    </div>
  );
}

export function ProntuarioTab({ consultas, pacienteId }: { consultas: ConsultaComProntuario[]; pacienteId: string }) {
  const router = useRouter();

  if (consultas.length === 0) {
    return (
      <EmptyState
        icon={ClipboardList}
        title="Nenhuma consulta registrada"
        description="Cadastre uma consulta em Consultas para começar a anotar o prontuário."
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {consultas.map((c) => (
        <ConsultaProntuario key={c.id} consulta={c} pacienteId={pacienteId} onSaved={() => router.refresh()} />
      ))}
    </div>
  );
}
