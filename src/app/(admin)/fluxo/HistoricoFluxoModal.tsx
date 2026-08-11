"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { getHistoricoFluxoAction } from "@/services/fluxo.actions";
import { fluxoEstagioLabel } from "@/lib/clara/fluxo";
import type { Tables } from "@/types/database.types";

export function HistoricoFluxoModal({
  pacienteId,
  pacienteNome,
  onClose,
}: {
  pacienteId: string | null;
  pacienteNome?: string;
  onClose: () => void;
}) {
  const [historico, setHistorico] = useState<Tables<"fluxo_movimentacoes">[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!pacienteId) return;
    setLoading(true);
    getHistoricoFluxoAction(pacienteId)
      .then(setHistorico)
      .finally(() => setLoading(false));
  }, [pacienteId]);

  return (
    <Modal open={!!pacienteId} onClose={onClose} title="Histórico no Fluxo" description={pacienteNome} size="sm">
      {loading ? (
        <p className="text-sm text-muted">Carregando...</p>
      ) : historico.length === 0 ? (
        <p className="text-sm text-muted">Nenhuma movimentação registrada.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {historico.map((mov) => (
            <li key={mov.id} className="border-l-2 border-brand pl-3">
              <p className="text-sm font-semibold text-ink">
                {mov.de_estagio ? fluxoEstagioLabel(mov.de_estagio) : "Início"} → {fluxoEstagioLabel(mov.para_estagio)}
              </p>
              <p className="text-xs text-muted">{new Date(mov.created_at).toLocaleString("pt-BR")}</p>
              {mov.observacao && <p className="mt-1 text-sm text-muted">{mov.observacao}</p>}
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
