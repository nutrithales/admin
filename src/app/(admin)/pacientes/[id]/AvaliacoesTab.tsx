"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Activity } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import type { Tables } from "@/types/database.types";
import { AvaliacaoDetailModal } from "./AvaliacaoDetailModal";

export function AvaliacoesTab({ avaliacoes, authId }: { avaliacoes: Tables<"avaliacoes_fisicas">[]; authId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Tables<"avaliacoes_fisicas"> | null>(null);

  function refresh() {
    router.refresh();
  }

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
        >
          <Plus className="size-4" /> Nova avaliação
        </Button>
      </div>

      {avaliacoes.length === 0 ? (
        <EmptyState
          icon={Activity}
          title="Nenhuma avaliação física registrada"
          description="Registre a primeira avaliação com antropometria e, se tiver, o PDF do Bodymetrix."
          action={
            <Button onClick={() => setOpen(true)}>
              <Plus className="size-4" /> Nova avaliação
            </Button>
          }
        />
      ) : (
        <div className="flex flex-col gap-3">
          {avaliacoes.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => {
                setEditing(a);
                setOpen(true);
              }}
              className="flex items-center justify-between rounded-lg border border-border bg-surface p-4 text-left shadow-card transition-colors hover:bg-bg-alt-2"
            >
              <div>
                <p className="font-semibold text-ink">{new Date(a.data).toLocaleDateString("pt-BR")}</p>
                <p className="text-xs text-muted-light">
                  {a.peso_kg ? `${a.peso_kg}kg` : "—"} · {a.percentual_gordura ? `${a.percentual_gordura}% gordura` : "sem % gordura"}
                  {a.path ? " · PDF anexado" : ""}
                </p>
              </div>
              <Badge tone={a.disponivel_paciente ? "success" : "muted"}>
                {a.disponivel_paciente ? "Disponível ao paciente" : "Privada"}
              </Badge>
            </button>
          ))}
        </div>
      )}

      <AvaliacaoDetailModal open={open} onClose={() => setOpen(false)} onSaved={refresh} authId={authId} avaliacao={editing} />
    </div>
  );
}
